import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { CreatePaymentDto } from "../dto/create-payment.dto";
import { JournalService } from "../../journal/journal.service";
import { PaymentRepository } from "../repositories/payment.repository";
import { BillRepository } from "../repositories/bill.repository";

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journalService: JournalService,
    private readonly paymentRepository: PaymentRepository,
    private readonly billRepository: BillRepository,
  ) {}

  async createPayment(dto: CreatePaymentDto) {
    if (!dto.allocations?.length) {
      throw new BadRequestException("Payment allocations are required");
    }
    if (dto.amount <= 0) {
      throw new BadRequestException("Payment amount must be greater than 0");
    }

    const allocationsTotal = dto.allocations.reduce((sum, a) => sum + Number(a.amount), 0);
    if (Math.abs(allocationsTotal - Number(dto.amount)) > 0.01) {
      throw new BadRequestException("Payment amount must equal the sum of allocation amounts");
    }

    for (const alloc of dto.allocations) {
      if (alloc.amount <= 0) {
        throw new BadRequestException("Allocation amount must be greater than 0");
      }
    }

    const billIds = Array.from(new Set(dto.allocations.map((a) => a.billId)));
    const bills = await this.billRepository.findByIds(this.prisma, billIds);

    if (bills.length !== billIds.length) {
      throw new BadRequestException("One or more bills not found");
    }

    // Vendor consistency + overpayment checks
    for (const b of bills) {
      if (b.vendorId !== dto.vendorId) {
        throw new BadRequestException("All allocated bills must belong to the specified vendor");
      }
    }

    // Compute per-bill increments and validate available balances.
    const allocByBill = new Map<string, number>();
    for (const a of dto.allocations) {
      allocByBill.set(a.billId, (allocByBill.get(a.billId) ?? 0) + Number(a.amount));
    }

    const billUpdates: Array<{
      billId: string;
      paidIncrement: number;
      balanceDecrement: number;
      status: string;
    }> = [];

    for (const b of bills) {
      const payAmount = allocByBill.get(b.id) ?? 0;
      if (payAmount === 0) continue;

      const newBalance = Number(b.balance) - payAmount;
      if (newBalance < -0.01) {
        throw new BadRequestException(`Overpayment detected for bill ${b.billNumber}`);
      }

      let status = b.status;
      if (newBalance <= 0.01) status = "PAID";
      else if (Number(b.balance) > 0) status = "PARTIALLY_PAID";

      billUpdates.push({
        billId: b.id,
        paidIncrement: payAmount,
        balanceDecrement: payAmount,
        status,
      });
    }

    if (billUpdates.length === 0) {
      throw new BadRequestException("At least one allocation must be provided");
    }

    // Get AP and Cash accounts
    const apAccount = await this.prisma.chartOfAccounts.findFirst({
      where: { accountType: "LIABILITY", isActive: true },
      orderBy: { accountCode: "asc" },
    });
    const cashAccount = await this.prisma.chartOfAccounts.findFirst({
      where: { accountType: "ASSET", isActive: true },
      orderBy: { accountCode: "asc" },
    });

    if (!apAccount || !cashAccount) {
      throw new BadRequestException(
        "Required accounts not found. Create at least one LIABILITY and one ASSET account in COA.",
      );
    }

    // Persist payment + allocations + bill balance updates atomically.
    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await this.paymentRepository.create(tx, {
        paymentNumber: `PAY-${Date.now()}`,
        vendorId: dto.vendorId,
        paymentDate: new Date(),
        amount: Number(dto.amount),
        method: dto.method,
        bankAccountId: dto.bankAccountId,
        allocations: dto.allocations.map((a) => ({
          billId: a.billId,
          amount: Number(a.amount),
        })),
      });

      await this.billRepository.updateBalancesAndStatus(tx, billUpdates);
      return created;
    });

    // GL ENTRY (must be posted for reporting)
    const journalEntry = await this.journalService.create({
      entryDate: new Date().toISOString(),
      description: `Vendor Payment ${payment.paymentNumber}`,
      sourceType: "VENDOR_PAYMENT",
      sourceId: payment.id,
      postingKind: "SETTLE_AP",
      lines: [
        {
          accountId: apAccount.id,
          debit: Number(dto.amount),
          credit: 0,
          description: "Accounts Payable",
        },
        {
          accountId: cashAccount.id,
          debit: 0,
          credit: Number(dto.amount),
          description: "Cash/Bank",
        },
      ],
    });

    await this.journalService.post(journalEntry.id);

    await this.paymentRepository.updateJournalEntryId(this.prisma, payment.id, journalEntry.id);

    return payment;
  }

  async findAll() {
    return this.paymentRepository.findAll(this.prisma);
  }

  async findOne(id: string) {
    return this.paymentRepository.findOne(this.prisma, id);
  }

  async update(
    id: string,
    dto: Partial<{
      paymentDate: Date;
      method: string;
    }>,
  ) {
    const payment = await this.findOne(id);
    if (!payment) {
      throw new BadRequestException("Payment not found");
    }

    if (dto.paymentDate && Number.isNaN(new Date(dto.paymentDate).getTime())) {
      throw new BadRequestException("Invalid paymentDate");
    }

    const data: Partial<{ paymentDate: Date; method: string }> = {};
    if (dto.paymentDate) data.paymentDate = new Date(dto.paymentDate);
    if (dto.method) data.method = dto.method;

    if (Object.keys(data).length === 0) {
      return payment;
    }

    return this.paymentRepository.update(this.prisma, id, data);
  }

  async remove(id: string) {
    const payment = await this.prisma.vendorPayment.findUnique({
      where: { id },
      include: { allocations: true },
    });
    if (!payment) {
      throw new BadRequestException("Payment not found");
    }

    // Reverse allocations from bills before deleting payment
    await this.prisma.$transaction(async (tx) => {
      for (const alloc of payment.allocations) {
        const bill = await tx.vendorBill.findUnique({ where: { id: alloc.billId } });
        if (!bill) continue;
        const newPaid = Number(bill.paidAmount) - Number(alloc.amount);
        const newBalance = Number(bill.balance) + Number(alloc.amount);
        const status = newBalance <= 0.01 ? "PAID" : newPaid > 0 ? "PARTIALLY_PAID" : "OPEN";

        await tx.vendorBill.update({
          where: { id: alloc.billId },
          data: {
            paidAmount: { decrement: alloc.amount },
            balance: { increment: alloc.amount },
            status,
          },
        });
      }

      await tx.vendorPaymentAllocation.deleteMany({
        where: { paymentId: id },
      });

      await tx.vendorPayment.delete({
        where: { id },
      });
    });

    return { success: true };
  }
}
