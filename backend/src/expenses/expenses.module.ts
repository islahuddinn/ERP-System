import { Module } from "@nestjs/common";
import { ExpensesController } from "./expenses.controller";
import { ExpensesService } from "./expenses.service";
import { ExpenseCategoriesController } from "./categories/expense-categories.controller";
import { ExpenseCategoriesService } from "./categories/expense-categories.service";
import { ExpenseReportsController } from "./reports/expense-reports.controller";
import { ExpenseReportsService } from "./reports/expense-reports.service";
import { AuditModule } from "../audit/audit.module";
import { UsersModule } from "../users/users.module";
import { CashInHandModule } from "../cash-in-hand/cash-in-hand.module";
import { CommonServicesModule } from "../common/services/common-services.module";

@Module({
  imports: [AuditModule, UsersModule, CashInHandModule, CommonServicesModule],
  controllers: [
    ExpenseReportsController,
    ExpenseCategoriesController,
    ExpensesController,
  ],
  providers: [ExpensesService, ExpenseCategoriesService, ExpenseReportsService],
  exports: [ExpensesService, ExpenseCategoriesService, ExpenseReportsService],
})
export class ExpensesModule {}
