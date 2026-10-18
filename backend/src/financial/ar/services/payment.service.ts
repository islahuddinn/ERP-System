import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { JournalService } from "../../journal/journal.service";
import { CreatePaymentDto } from "../dto/create-payment.dto";
import { PaymentRepository } from "../repositories/payment.repository";
import { InvoiceRepository } from "../repositories/invoice.repository";

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journalService: JournalService,
    private readonly paymentRepository: PaymentRepository,
    private readonly invoiceRepository: InvoiceRepository,
  ) {}

  private async resolveReceivablesAccount() {
    const byCode = await this.prisma.chartOfAccounts.findFirst({
      where: {
        accountType: "ASSET",
        isActive: true,
        accountCode: { contains: "AR", mode: "insensitive" },
      },
    });
    if (byCode) return byCode;

    return this.prisma.chartOfAccounts.findFirst({
      where: { accountType: "ASSET", isActive: true },
      orderBy: { accountCode: "asc" },
    });
  }

  private async resolveCashAccount() {
    const byCode = await this.prisma.chartOfAccounts.findFirst({
      where: {
        accountType: "ASSET",
        isActive: true,
        OR: [
          { accountCode: { contains: "CASH", mode: "insensitive" } },
          { accountCode: { contains: "BANK", mode: "insensitive" } },
        ],
      },
    });
    if (byCode) return byCode;

    return this.prisma.chartOfAccounts.findFirst({
      where: { accountType: "ASSET", isActive: true },
      orderBy: { accountCode: "asc" },
    });
  }

  async createPayment(dto: CreatePaymentDto) {
    if (!dto.allocations?.length) {
      throw new BadRequestException("Payment allocations are required");
    }
    if (dto.amount <= 0) {
      throw new BadRequestException("Payment amount must be greater than 0");
    }

    const allocationsTotal = dto.allocations.reduce(
      (sum, a) => sum + Number(a.amount),
      0,
    );

    if (Math.abs(allocationsTotal - Number(dto.amount)) > 0.01) {
      throw new BadRequestException(
        "Payment amount must equal the sum of allocation amounts",
      );
    }

    for (const alloc of dto.allocations) {
      if (alloc.amount <= 0) {
        throw new BadRequestException(
          "Allocation amount must be greater than 0",
        );
      }
    }

    const invoiceIds = Array.from(
      new Set(dto.allocations.map((a) => a.invoiceId)),
    );
    const invoices = await this.invoiceRepository.findByIds(
      this.prisma,
      invoiceIds,
    );

    if (invoices.length !== invoiceIds.length) {
      throw new BadRequestException("One or more invoices not found");
    }

    // Validate customer consistency + over-application
    const allocByInvoice = new Map<string, number>();
    for (const a of dto.allocations) {
      allocByInvoice.set(
        a.invoiceId,
        (allocByInvoice.get(a.invoiceId) ?? 0) + Number(a.amount),
      );
    }

    const invoiceUpdates: Array<{
      invoiceId: string;
      paidIncrement: number;
      balanceDecrement: number;
      status: string;
    }> = [];

    for (const inv of invoices) {
      if (inv.customerId !== dto.customerId) {
        throw new BadRequestException(
          "All allocated invoices must belong to the specified customer",
        );
      }

      const payAmount = allocByInvoice.get(inv.id) ?? 0;
      if (payAmount === 0) continue;

      const newBalance = Number(inv.balance) - payAmount;
      if (newBalance < -0.01) {
        throw new BadRequestException(
          `Overpayment detected for invoice ${inv.invoiceNumber}`,
        );
      }

      let status = inv.status;
      if (newBalance <= 0.01) status = "PAID";
      else if (Number(inv.balance) > 0) status = "PARTIALLY_PAID";

      invoiceUpdates.push({
        invoiceId: inv.id,
        paidIncrement: payAmount,
        balanceDecrement: payAmount,
        status,
      });
    }

    if (invoiceUpdates.length === 0) {
      throw new BadRequestException("At least one allocation must be provided");
    }

    const receivablesAccount = await this.resolveReceivablesAccount();
    const cashAccount = await this.resolveCashAccount();

    if (!receivablesAccount || !cashAccount) {
      throw new BadRequestException(
        "Required accounts not found. Create ASSET (AR/Cash) accounts in COA.",
      );
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await this.paymentRepository.create(tx, {
        paymentNumber: `ARPAY-${Date.now()}`,
        customerId: dto.customerId,
        paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
        amount: Number(dto.amount),
        method: dto.method,
        bankAccountId: dto.bankAccountId,
        allocations: dto.allocations.map((a) => ({
          invoiceId: a.invoiceId,
          amount: Number(a.amount),
        })),
      });

      await this.invoiceRepository.updateBalancesAndStatus(
        tx,
        invoiceUpdates,
      );

      return created;
    });

    const journalEntry = await this.journalService.create({
      entryDate: dto.paymentDate
        ? new Date(dto.paymentDate).toISOString()
        : new Date().toISOString(),
      description: `Customer Payment ${payment.paymentNumber}`,
      sourceType: "CUSTOMER_AR_PAYMENT",
      sourceId: payment.id,
      postingKind: "SETTLE_AR",
      lines: [
        {
          accountId: cashAccount.id,
          debit: Number(dto.amount),
          credit: 0,
          description: "Cash",
        },
        {
          accountId: receivablesAccount.id,
          debit: 0,
          credit: Number(dto.amount),
          description: "Accounts Receivable",
        },
      ],
    });

    await this.journalService.post(journalEntry.id);
    await this.paymentRepository.updateJournalEntryId(
      this.prisma,
      payment.id,
      journalEntry.id,
    );

    return payment;
  }

  async findAll() {
    return this.paymentRepository.findAll(this.prisma);
  }

  async findOne(id: string) {
    const payment = await this.paymentRepository.findOne(this.prisma, id);
    if (!payment) {
      throw new BadRequestException("Payment not found");
    }
    return payment;
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.paymentRepository.softDelete(this.prisma, id);
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
}

