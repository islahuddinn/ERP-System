import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { CustomersModule } from "../customers/customers.module";
import { CustomerLedgerAdjustmentsRepository } from "./customer-ledger-adjustments.repository";
import { CustomerLedgerAdjustmentsService } from "./customer-ledger-adjustments.service";
import { CustomerLedgerAdjustmentsController } from "./customer-ledger-adjustments.controller";

@Module({
  imports: [AuditModule, UsersModule, CustomersModule],
  providers: [CustomerLedgerAdjustmentsRepository, CustomerLedgerAdjustmentsService],
  controllers: [CustomerLedgerAdjustmentsController],
  exports: [CustomerLedgerAdjustmentsService],
})
export class CustomerLedgerAdjustmentsModule {}
