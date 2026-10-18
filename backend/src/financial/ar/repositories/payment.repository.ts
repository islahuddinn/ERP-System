import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class PaymentRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    tx: any,
    data: {
      paymentNumber: string;
      customerId: string;
      paymentDate: Date;
      amount: number;
      method: string;
      bankAccountId?: string;
      allocations: Array<{ invoiceId: string; amount: number }>;
    },
  ) {
    return tx.customerARPayment.create({
      data: {
        paymentNumber: data.paymentNumber,
        customerId: data.customerId,
        paymentDate: data.paymentDate,
        amount: data.amount,
        method: data.method,
        ...(data.bankAccountId && { bankAccountId: data.bankAccountId }),
        allocations: {
          create: data.allocations.map((a) => ({
            invoiceId: a.invoiceId,
            amount: a.amount,
          })),
        },
      },
      include: {
        customer: true,
        allocations: { include: { invoice: true } },
      },
    });
  }

  updateJournalEntryId(
    tx: any,
    paymentId: string,
    journalEntryId: string,
  ) {
    return tx.customerARPayment.update({
      where: { id: paymentId },
      data: { journalEntryId },
    });
  }

  findAll(tx: any) {
    return tx.customerARPayment.findMany({
      where: { deletedAt: null },
      include: {
        customer: true,
        allocations: { include: { invoice: true } },
      },
      orderBy: { paymentDate: "desc" },
    });
  }

  findOne(tx: any, id: string) {
    return tx.customerARPayment.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        allocations: { include: { invoice: true } },
      },
    });
  }

  softDelete(tx: any, id: string) {
    return tx.customerARPayment.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  update(
    tx: any,
    id: string,
    data: Partial<{ paymentDate: Date; method: string }>,
  ) {
    return tx.customerARPayment.update({
      where: { id },
      data,
      include: {
        customer: true,
        allocations: { include: { invoice: true } },
      },
    });
  }
}

