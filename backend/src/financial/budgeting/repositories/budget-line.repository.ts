import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class BudgetLineRepository {
  constructor(private readonly prisma: PrismaService) {}

  updateActualAmount(tx: any, lineId: string, actualAmount: number) {
    return tx.budgetLine.update({
      where: { id: lineId },
      data: { actualAmount },
    });
  }
}

