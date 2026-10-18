import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { JournalService } from "../../journal/journal.service";
import { CreateInvoiceDto } from "../dto/create-invoice.dto";
import { InvoiceRepository } from "../repositories/invoice.repository";

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly journalService: JournalService,
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

  private async resolveRevenueAccount() {
    const byCode = await this.prisma.chartOfAccounts.findFirst({
      where: {
        accountType: "REVENUE",
        isActive: true,
        accountCode: { contains: "REV", mode: "insensitive" },
      },
    });
    if (byCode) return byCode;

    return this.prisma.chartOfAccounts.findFirst({
      where: { accountType: "REVENUE", isActive: true },
      orderBy: { accountCode: "asc" },
    });
  }

  async createInvoice(dto: CreateInvoiceDto) {
    if (dto.totalAmount <= 0) {
      throw new BadRequestException("totalAmount must be > 0");
    }

    const receivablesAccount = await this.resolveReceivablesAccount();
    const revenueAccount = await this.resolveRevenueAccount();

    if (!receivablesAccount || !revenueAccount) {
      throw new BadRequestException(
        "Required accounts not found. Create ASSET (AR) and REVENUE accounts in COA.",
      );
    }

    const invoice = await this.prisma.$transaction(async (tx) => {
      return this.invoiceRepository.create(tx, {
        invoiceNumber: `INV-${Date.now()}`,
        customerId: dto.customerId,
        invoiceDate: new Date(dto.invoiceDate),
        dueDate: new Date(dto.dueDate),
        totalAmount: Number(dto.totalAmount),
        status: "OPEN",
      });
    });

    const journalEntry = await this.journalService.create({
      entryDate: new Date(dto.invoiceDate).toISOString(),
      description: `Customer Invoice ${invoice.invoiceNumber}`,
      sourceType: "CUSTOMER_INVOICE",
      sourceId: invoice.id,
      postingKind: "RECOGNIZE_AR",
      lines: [
        {
          accountId: receivablesAccount.id,
          debit: Number(dto.totalAmount),
          credit: 0,
          description: "Accounts Receivable",
        },
        {
          accountId: revenueAccount.id,
          debit: 0,
          credit: Number(dto.totalAmount),
          description: "Revenue",
        },
      ],
    });

    await this.journalService.post(journalEntry.id);
    await this.invoiceRepository.updateJournalEntryId(
      this.prisma,
      invoice.id,
      journalEntry.id,
    );

    return invoice;
  }

  async findAll() {
    return this.invoiceRepository.findAll(this.prisma);
  }

  async findOne(id: string) {
    const invoice = await this.invoiceRepository.findOne(this.prisma, id);
    if (!invoice) {
      throw new BadRequestException("Invoice not found");
    }
    return invoice;
  }

  async update(
    id: string,
    dto: Partial<{
      dueDate: Date;
      status: string;
    }>,
  ) {
    await this.findOne(id);

    const payload: any = {};
    if (dto.dueDate) payload.dueDate = new Date(dto.dueDate);
    if (dto.status) payload.status = dto.status;

    return this.invoiceRepository.update(this.prisma, id, payload);
  }

  async remove(id: string) {
    const invoice = await this.findOne(id);
    if (Number(invoice.paidAmount) > 0) {
      throw new BadRequestException("Cannot delete invoice with payments");
    }
    return this.invoiceRepository.softDelete(this.prisma, id);
  }
}

