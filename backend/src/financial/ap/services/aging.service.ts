import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { BillRepository } from "../repositories/bill.repository";

@Injectable()
export class AgingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly billRepository: BillRepository,
  ) {}

  async getVendorBillAging(asOfDate?: Date) {
    const asOf = asOfDate ? new Date(asOfDate) : new Date();
    if (Number.isNaN(asOf.getTime())) {
      throw new BadRequestException("Invalid asOfDate");
    }

    const bills = await this.billRepository.listAging(this.prisma, asOf);

    const buckets = {
      "0-30": 0,
      "31-60": 0,
      "61-90": 0,
      "91-180": 0,
      "181+": 0,
    };

    const result = bills.map((b) => {
      const diffMs = asOf.getTime() - new Date(b.dueDate).getTime();
      const daysPastDue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      let bucket: keyof typeof buckets;
      if (daysPastDue <= 30) bucket = "0-30";
      else if (daysPastDue <= 60) bucket = "31-60";
      else if (daysPastDue <= 90) bucket = "61-90";
      else if (daysPastDue <= 180) bucket = "91-180";
      else bucket = "181+";

      const outstanding = Number(b.balance);
      buckets[bucket] += outstanding;

      return {
        billId: b.id,
        billNumber: b.billNumber,
        vendorId: b.vendorId,
        vendorName: b.vendor?.name,
        dueDate: b.dueDate,
        daysPastDue,
        amountOutstanding: outstanding,
        bucket,
        status: b.status,
      };
    });

    return {
      asOfDate: asOf,
      totalsByBucket: buckets,
      bills: result,
    };
  }
}

