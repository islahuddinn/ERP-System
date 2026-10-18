import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { CreateBillDto } from "../dto/create-bill.dto";
import { JournalService } from "../../journal/journal.service";
import { BillRepository } from "../repositories/bill.repository";

@Injectable()
export class BillService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journalService: JournalService,
    private readonly billRepository: BillRepository,
  ) {}

  async createBill(dto: CreateBillDto) {
    if (!dto.items?.length) {
      throw new BadRequestException("Bill must include at least one item");
    }

    for (const item of dto.items) {
      if (item.quantity <= 0) {
        throw new BadRequestException("Item quantity must be greater than 0");
      }
      if (item.unitPrice <= 0) {
        throw new BadRequestException("Item unitPrice must be greater than 0");
      }
    }

    const total = dto.items.reduce(
      (sum, i) => sum + i.quantity * i.unitPrice,
      0,
    );

    if (total <= 0) {
      throw new BadRequestException("Bill total must be greater than 0");
    }

    const expenseAccount = await this.prisma.chartOfAccounts.findFirst({
      where: { accountType: "EXPENSE", isActive: true },
      orderBy: { accountCode: "asc" },
    });
    const apAccount = await this.prisma.chartOfAccounts.findFirst({
      where: { accountType: "LIABILITY", isActive: true },
      orderBy: { accountCode: "asc" },
    });

    if (!expenseAccount || !apAccount) {
      throw new BadRequestException(
        "Required accounts not found. Create at least one EXPENSE and one LIABILITY account in COA.",
      );
    }

    const bill = await this.prisma.$transaction(async (tx) => {
      return this.billRepository.create(tx, {
        billNumber: `BILL-${Date.now()}`,
        vendorId: dto.vendorId,
        billDate: new Date(dto.billDate),
        dueDate: new Date(dto.dueDate),
        totalAmount: total,
        balance: total,
        items: dto.items.map((i) => ({
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          total: i.quantity * i.unitPrice,
        })),
      });
    });

    // GL POSTING (must be posted for reporting)
    const journalEntry = await this.journalService.create({
      entryDate: new Date(dto.billDate).toISOString(),
      description: `Vendor Bill ${bill.billNumber}`,
      sourceType: "VENDOR_BILL",
      sourceId: bill.id,
      postingKind: "RECOGNIZE_AP",
      lines: [
        {
          accountId: expenseAccount.id,
          debit: total,
          credit: 0,
          description: "Vendor Bill Expense",
        },
        {
          accountId: apAccount.id,
          debit: 0,
          credit: total,
          description: "Accounts Payable",
        },
      ],
    });

    await this.journalService.post(journalEntry.id);
    await this.billRepository.updateJournalEntryId(
      this.prisma,
      bill.id,
      journalEntry.id,
    );

    return bill;
  }

  async findAll() {
    return this.prisma.vendorBill.findMany({
      include: {
        vendor: true,
        items: true
      },
      orderBy: { billDate: 'desc' }
    });
  }

  async findOne(id: string) {
    return this.prisma.vendorBill.findUnique({
      where: { id },
      include: {
        vendor: true,
        items: true,
        payments: {
          include: {
            payment: true
          }
        }
      }
    });
  }

  async delete(id: string) {
    const bill = await this.prisma.vendorBill.findUnique({
      where: { id }
    });

    if (!bill) {
      throw new BadRequestException('Bill not found');
    }

    if (Number(bill.paidAmount) > 0) {
      throw new BadRequestException('Cannot delete bill with payments');
    }

    return this.prisma.vendorBill.delete({
      where: { id }
    });
  }

  async update(
    id: string,
    dto: Partial<{
      dueDate: Date;
      status: string;
    }>,
  ) {
    const bill = await this.prisma.vendorBill.findUnique({
      where: { id },
    });
    if (!bill) {
      throw new BadRequestException("Bill not found");
    }

    const payload: any = {};
    if (dto.dueDate) payload.dueDate = new Date(dto.dueDate);
    if (dto.status) payload.status = dto.status;

    return this.prisma.vendorBill.update({
      where: { id },
      data: payload,
      include: {
        vendor: true,
        items: true,
      },
    });
  }
}
