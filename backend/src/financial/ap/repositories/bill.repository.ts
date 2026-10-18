import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class BillRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    tx: any,
    data: {
      billNumber: string;
      vendorId: string;
      billDate: Date;
      dueDate: Date;
      totalAmount: number;
      balance: number;
      items: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
        total: number;
      }>;
    },
  ) {
    return tx.vendorBill.create({
      data: {
        billNumber: data.billNumber,
        vendorId: data.vendorId,
        billDate: data.billDate,
        dueDate: data.dueDate,
        totalAmount: data.totalAmount,
        paidAmount: 0,
        balance: data.balance,
        status: "OPEN",
        items: {
          create: data.items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            total: i.total,
          })),
        },
      },
      include: {
        vendor: true,
        items: true,
      },
    });
  }

  findByIds(tx: any, ids: string[]) {
    return tx.vendorBill.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        vendorId: true,
        dueDate: true,
        billNumber: true,
        balance: true,
        status: true,
      },
    });
  }

  updateBalancesAndStatus(
    tx: any,
    data: Array<{
      billId: string;
      paidIncrement: number;
      balanceDecrement: number;
      status: string;
    }>,
  ) {
    return Promise.all(
      data.map((b) =>
        tx.vendorBill.update({
          where: { id: b.billId },
          data: {
            paidAmount: { increment: b.paidIncrement },
            balance: { decrement: b.balanceDecrement },
            status: b.status,
          },
        }),
      ),
    );
  }

  updateJournalEntryId(tx: any, billId: string, journalEntryId: string) {
    return tx.vendorBill.update({
      where: { id: billId },
      data: { journalEntryId },
    });
  }

  listAging(tx: any, asOf: Date) {
    return tx.vendorBill.findMany({
      where: {
        deletedAt: null,
        billDate: { lte: asOf },
        status: { in: ["OPEN", "PARTIALLY_PAID"] },
        balance: { gt: 0 },
      },
      include: {
        vendor: true,
      },
      orderBy: { dueDate: "asc" },
    });
  }
}

