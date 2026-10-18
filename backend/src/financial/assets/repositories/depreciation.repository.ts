import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class DepreciationRepository {
  constructor(private readonly prisma: PrismaService) {}

  existsForMonth(tx: any, assetId: string, monthStart: Date, monthEnd: Date) {
    return tx.depreciationEntry.findFirst({
      where: {
        assetId,
        date: {
          gte: monthStart,
          lt: monthEnd,
        },
      },
      select: { id: true },
    });
  }

  create(
    tx: any,
    data: {
      assetId: string;
      amount: number;
      date: Date;
      journalEntryId: string;
    },
  ) {
    return tx.depreciationEntry.create({
      data: {
        assetId: data.assetId,
        amount: data.amount,
        date: data.date,
        journalEntryId: data.journalEntryId,
      },
    });
  }
}

