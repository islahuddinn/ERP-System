import { Module } from "@nestjs/common";
import { PosService } from "./pos.service";
import { PosController } from "./pos.controller";
import { StockTransactionsModule } from "../stock-transactions/stock-transactions.module";
import { CommonServicesModule } from "../common/services/common-services.module";
import { AuditModule } from "../audit/audit.module";
import { CustomersModule } from "../customer-management/customers/customers.module";
import { CashInHandModule } from "../cash-in-hand/cash-in-hand.module";
import { UsersModule } from "../users/users.module";
import { MasterPrismaModule } from "../master-prisma/master-prisma.module";
import { InvoicesModule } from "../invoices/invoices.module";

@Module({
  imports: [
    StockTransactionsModule,
    CommonServicesModule,
    AuditModule,
    CustomersModule,
    CashInHandModule,
    UsersModule,
    MasterPrismaModule,
    InvoicesModule,
  ],
  controllers: [PosController],
  providers: [PosService],
  exports: [PosService],
})
export class PosModule {}
