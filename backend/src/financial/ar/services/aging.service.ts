import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { InvoiceRepository } from "../repositories/invoice.repository";

@Injectable()
export class AgingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceRepository: InvoiceRepository,
  ) {}

  async getCustomerInvoiceAging(asOfDate?: Date) {
    const asOf = asOfDate ? new Date(asOfDate) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException("Invalid asOfDate");
    }

    const invoices = await this.invoiceRepository.listAging(this.prisma);

    const buckets = {
      "0-30": 0,
      "31-60": 0,
      "61-90": 0,
      "91-180": 0,
      "181+": 0,
    };

    const bills = invoices.map((inv) => {
      const diffMs = asOf.getTime() - new Date(inv.dueDate).getTime();
      const daysPastDue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      let bucket: keyof typeof buckets;
      if (daysPastDue <= 30) bucket = "0-30";
      else if (daysPastDue <= 60) bucket = "31-60";
      else if (daysPastDue <= 90) bucket = "61-90";
      else if (daysPastDue <= 180) bucket = "91-180";
      else bucket = "181+";

      const outstanding = Number(inv.balance);
      buckets[bucket] += outstanding;

      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerId: inv.customerId,
        customerName: inv.customer?.name,
        dueDate: inv.dueDate,
        daysPastDue,
        amountOutstanding: outstanding,
        bucket,
        status: inv.status,
      };
    });

    return {
      asOfDate: asOf,
      totalsByBucket: buckets,
      invoices: bills,
    };
  }
}

