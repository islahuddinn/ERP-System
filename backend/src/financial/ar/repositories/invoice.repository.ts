import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class InvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    tx: any,
    data: {
      invoiceNumber: string;
      customerId: string;
      invoiceDate: Date;
      dueDate: Date;
      totalAmount: number;
      status: string;
    },
  ) {
    return tx.customerInvoice.create({
      data: {
        invoiceNumber: data.invoiceNumber,
        customerId: data.customerId,
        invoiceDate: data.invoiceDate,
        dueDate: data.dueDate,
        totalAmount: data.totalAmount,
        paidAmount: 0,
        balance: data.totalAmount,
        status: data.status,
      },
      include: {
        customer: true,
      },
    });
  }

  findByIds(tx: any, ids: string[]) {
    return tx.customerInvoice.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        customerId: true,
        invoiceNumber: true,
        dueDate: true,
        balance: true,
        status: true,
      },
    });
  }

  updateBalancesAndStatus(
    tx: any,
    data: Array<{
      invoiceId: string;
      paidIncrement: number;
      balanceDecrement: number;
      status: string;
    }>,
  ) {
    return Promise.all(
      data.map((i) =>
        tx.customerInvoice.update({
          where: { id: i.invoiceId },
          data: {
            paidAmount: { increment: i.paidIncrement },
            balance: { decrement: i.balanceDecrement },
            status: i.status,
          },
        }),
      ),
    );
  }

  updateJournalEntryId(tx: any, invoiceId: string, journalEntryId: string) {
    return tx.customerInvoice.update({
      where: { id: invoiceId },
      data: { journalEntryId },
    });
  }

  listAging(tx: any) {
    return tx.customerInvoice.findMany({
      where: {
        deletedAt: null,
        balance: { gt: 0 },
        status: { in: ["OPEN", "PARTIALLY_PAID"] },
      },
      include: { customer: true },
      orderBy: { dueDate: "asc" },
    });
  }

  findAll(tx: any) {
    return tx.customerInvoice.findMany({
      where: { deletedAt: null },
      include: { customer: true, payments: true },
      orderBy: { invoiceDate: "desc" },
    });
  }

  findOne(tx: any, id: string) {
    return tx.customerInvoice.findFirst({
      where: { id, deletedAt: null },
      include: {
        customer: true,
        payments: {
          include: { payment: true },
        },
      },
    });
  }

  update(
    tx: any,
    id: string,
    data: Partial<{
      dueDate: Date;
      status: string;
    }>,
  ) {
    return tx.customerInvoice.update({
      where: { id },
      data,
      include: { customer: true },
    });
  }

  softDelete(tx: any, id: string) {
    return tx.customerInvoice.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

