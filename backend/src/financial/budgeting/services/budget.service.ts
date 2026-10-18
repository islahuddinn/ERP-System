import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { BudgetRepository } from "../repositories/budget.repository";
import { BudgetLineRepository } from "../repositories/budget-line.repository";
import { CreateBudgetDto } from "../dto/create-budget.dto";

@Injectable()
export class BudgetService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly budgetRepository: BudgetRepository,
    private readonly budgetLineRepository: BudgetLineRepository,
  ) {}

  async createBudget(dto: CreateBudgetDto) {
    if (!dto.lines?.length) {
      throw new BadRequestException("Budget lines are required");
    }

    const sum = dto.lines.reduce((s, l) => s + Number(l.budgetedAmount), 0);
    if (Math.abs(sum - Number(dto.totalBudget)) > 0.01) {
      // Keep strict to avoid confusion between totalBudget and lines.
      throw new BadRequestException(
        "totalBudget must equal the sum of budgetedAmount in lines",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const budget = await this.budgetRepository.create(tx, {
        fiscalYear: dto.fiscalYear,
        totalBudget: dto.totalBudget,
        lines: dto.lines.map((l) => ({
          accountId: l.accountId,
          period: l.period,
          budgetedAmount: l.budgetedAmount,
        })),
      });

      return budget;
    });
  }

  private async calculateActualAmountForLine(
    accountId: string,
    normalBalance: "DEBIT" | "CREDIT",
    fiscalYear: number,
    period: number,
  ) {
    const monthStart = new Date(fiscalYear, period - 1, 1);
    const monthEnd = new Date(fiscalYear, period, 1);

    const lines = await this.prisma.journalLine.findMany({
      where: {
        accountId,
        journal: {
          status: "POSTED",
          entryDate: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
      },
      include: { account: true },
    });

    let sum = 0;
    for (const l of lines) {
      const debit = Number(l.debitAmount ?? 0);
      const credit = Number(l.creditAmount ?? 0);
      if (normalBalance === "DEBIT") sum += debit - credit;
      else sum += credit - debit;
    }
    return sum;
  }

  async getVariance(fiscalYear: number, period?: number) {
    const budgets = await this.budgetRepository.findByYear(
      this.prisma,
      fiscalYear,
    );

    if (!budgets?.length) {
      throw new BadRequestException(`No budget found for fiscalYear=${fiscalYear}`);
    }

    // If multiple budgets exist for a year, aggregate by lines.
    const allLines = budgets.flatMap((b) => b.lines);

    const linesToProcess = period
      ? allLines.filter((l) => l.period === period)
      : allLines;

    if (!linesToProcess.length) {
      return {
        fiscalYear,
        period: period ?? null,
        lines: [],
      };
    }

    // Cache account normal balances.
    const accountIds: string[] = Array.from(
      new Set(linesToProcess.map((l) => l.accountId as string)),
    );
    const accountMap = new Map<
      string,
      "DEBIT" | "CREDIT"
    >(
      (
        await this.prisma.chartOfAccounts.findMany({
          where: { id: { in: accountIds } },
          select: { id: true, normalBalance: true },
        })
      ).map((a) => [a.id, a.normalBalance as any]),
    );

    const computed = [];

    for (const line of linesToProcess) {
      const normalBalance = accountMap.get(line.accountId);
      if (!normalBalance) {
        throw new BadRequestException(
          `Account normalBalance not found for accountId=${line.accountId}`,
        );
      }

      const actualAmount = await this.calculateActualAmountForLine(
        line.accountId,
        normalBalance,
        fiscalYear,
        line.period,
      );

      await this.prisma.$transaction(async (tx) => {
        await this.budgetLineRepository.updateActualAmount(
          tx,
          line.id,
          actualAmount,
        );
      });

      const variance = Number(line.budgetedAmount) - actualAmount;
      computed.push({
        budgetLineId: line.id,
        accountId: line.accountId,
        period: line.period,
        budgetedAmount: Number(line.budgetedAmount),
        actualAmount,
        variance,
      });
    }

    return {
      fiscalYear,
      period: period ?? null,
      lines: computed,
    };
  }

  async findAll() {
    return this.budgetRepository.findAll(this.prisma);
  }

  async findOne(id: string) {
    const budget = await this.budgetRepository.findOne(this.prisma, id);
    if (!budget) {
      throw new BadRequestException("Budget not found");
    }
    return budget;
  }

  async update(
    id: string,
    dto: Partial<{ fiscalYear: number; totalBudget: number }>,
  ) {
    await this.findOne(id);
    const payload: any = {};
    if (dto.fiscalYear !== undefined) payload.fiscalYear = Number(dto.fiscalYear);
    if (dto.totalBudget !== undefined)
      payload.totalBudget = Number(dto.totalBudget);
    return this.budgetRepository.update(this.prisma, id, payload);
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.budgetRepository.softDelete(this.prisma, id);
  }
}

