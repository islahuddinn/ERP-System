import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    tx: any,
    data: {
      paymentNumber: string;
      vendorId: string;
      paymentDate: Date;
      amount: number;
      method: string;
      bankAccountId?: string;
      allocations: Array<{ billId: string; amount: number }>;
    },
  ) {
    return tx.vendorPayment.create({
      data: {
        paymentNumber: data.paymentNumber,
        vendorId: data.vendorId,
        paymentDate: data.paymentDate,
        amount: data.amount,
        method: data.method,
        ...(data.bankAccountId && { bankAccountId: data.bankAccountId }),
        allocations: {
          create: data.allocations.map((a) => ({
            billId: a.billId,
            amount: a.amount,
          })),
        },
      },
      include: {
        vendor: true,
        allocations: {
          include: { bill: true },
        },
      },
    });
  }

  updateJournalEntryId(
    tx: any,
    paymentId: string,
    journalEntryId: string,
  ) {
    return tx.vendorPayment.update({
      where: { id: paymentId },
      data: { journalEntryId },
    });
  }

  findAll(tx: any) {
    return tx.vendorPayment.findMany({
      include: {
        vendor: true,
        allocations: {
          include: { bill: true },
        },
      },
      orderBy: { paymentDate: "desc" },
    });
  }

  findOne(tx: any, id: string) {
    return tx.vendorPayment.findUnique({
      where: { id },
      include: {
        vendor: true,
        allocations: {
          include: { bill: true },
        },
      },
    });
  }

  update(
    tx: any,
    id: string,
    data: Partial<{ paymentDate: Date; method: string }>,
  ) {
    return tx.vendorPayment.update({
      where: { id },
      data,
      include: {
        vendor: true,
        allocations: {
          include: { bill: true },
        },
      },
    });
  }
}

