import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class BankAccountRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tx: any, data: { accountName: string; currency: string; balance: number }) {
    return tx.bankAccount.create({
      data: {
        accountName: data.accountName,
        currency: data.currency,
        balance: data.balance,
      },
    });
  }

  findAll(tx: any) {
    return tx.bankAccount.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
    });
  }

  findById(tx: any, id: string) {
    return tx.bankAccount.findFirst({
      where: { id, deletedAt: null },
    });
  }

  updateBalance(
    tx: any,
    id: string,
    delta: number,
  ) {
    if (delta === 0) return tx.bankAccount.findUnique({ where: { id } });

    return tx.bankAccount.update({
      where: { id },
      data: {
        balance: { increment: delta },
      },
    });
  }

  update(
    tx: any,
    id: string,
    data: Partial<{ accountName: string; currency: string }>,
  ) {
    return tx.bankAccount.update({
      where: { id },
      data,
    });
  }

  softDelete(tx: any, id: string) {
    return tx.bankAccount.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

