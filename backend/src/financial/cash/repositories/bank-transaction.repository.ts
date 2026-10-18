import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class BankTransactionRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(
    tx: any,
    data: {
      bankAccountId: string;
      type: "DEPOSIT" | "WITHDRAW";
      amount: number;
      transactionDate: Date;
      description?: string;
      journalEntryId?: string | null;
    },
  ) {
    return tx.bankTransaction.create({
      data: {
        bankAccountId: data.bankAccountId,
        type: data.type,
        amount: data.amount,
        transactionDate: data.transactionDate,
        description: data.description,
        journalEntryId: data.journalEntryId ?? null,
      },
    });
  }

  updateJournalEntryId(
    tx: any,
    transactionId: string,
    journalEntryId: string,
  ) {
    return tx.bankTransaction.update({
      where: { id: transactionId },
      data: { journalEntryId },
    });
  }

  findAll(tx: any) {
    return tx.bankTransaction.findMany({
      where: { deletedAt: null },
      include: { bankAccount: true },
      orderBy: { transactionDate: "desc" },
    });
  }

  findOne(tx: any, id: string) {
    return tx.bankTransaction.findFirst({
      where: { id, deletedAt: null },
      include: { bankAccount: true },
    });
  }

  softDelete(tx: any, id: string) {
    return tx.bankTransaction.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  update(
    tx: any,
    id: string,
    data: Partial<{ transactionDate: Date; description: string }>,
  ) {
    return tx.bankTransaction.update({
      where: { id },
      data,
      include: { bankAccount: true },
    });
  }
}

