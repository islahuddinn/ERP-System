import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class BudgetRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(tx: any, data: { fiscalYear: number; totalBudget: number; lines: Array<{ accountId: string; period: number; budgetedAmount: number }> }) {
    return tx.budget.create({
      data: {
        fiscalYear: data.fiscalYear,
        totalBudget: data.totalBudget,
        lines: {
          create: data.lines.map((l) => ({
            accountId: l.accountId,
            period: l.period,
            budgetedAmount: l.budgetedAmount,
            actualAmount: 0,
          })),
        },
      },
      include: { lines: true },
    });
  }

  findByYear(tx: any, fiscalYear: number) {
    return tx.budget.findMany({
      where: { fiscalYear },
      include: { lines: true },
    });
  }

  findAll(tx: any) {
    return tx.budget.findMany({
      where: { deletedAt: null },
      include: { lines: true },
      orderBy: { fiscalYear: "desc" },
    });
  }

  findOne(tx: any, id: string) {
    return tx.budget.findFirst({
      where: { id, deletedAt: null },
      include: { lines: true },
    });
  }

  update(
    tx: any,
    id: string,
    data: Partial<{ fiscalYear: number; totalBudget: number }>,
  ) {
    return tx.budget.update({
      where: { id },
      data,
      include: { lines: true },
    });
  }

  softDelete(tx: any, id: string) {
    return tx.budget.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

