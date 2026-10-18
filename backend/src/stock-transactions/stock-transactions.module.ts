import { Module } from "@nestjs/common";
import { StockTransactionsService } from "./stock-transactions.service";
import { StockTransactionsController } from "./stock-transactions.controller";
import { AuditModule } from "../audit/audit.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [AuditModule, UsersModule],
  providers: [StockTransactionsService],
  controllers: [StockTransactionsController],
  exports: [StockTransactionsService],
})
export class StockTransactionsModule {}
