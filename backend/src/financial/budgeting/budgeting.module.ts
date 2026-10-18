import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { UsersModule } from "../../users/users.module";
import { BudgetController } from "./controllers/budget.controller";
import { BudgetService } from "./services/budget.service";
import { BudgetRepository } from "./repositories/budget.repository";
import { BudgetLineRepository } from "./repositories/budget-line.repository";

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [BudgetController],
  providers: [BudgetService, BudgetRepository, BudgetLineRepository],
  exports: [BudgetService],
})
export class BudgetingModule {}

