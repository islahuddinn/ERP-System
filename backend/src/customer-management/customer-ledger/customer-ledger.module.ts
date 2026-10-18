import { Module } from "@nestjs/common";
import { UsersModule } from "../../users/users.module";
import { CustomersModule } from "../customers/customers.module";
import { CustomerLedgerRepository } from "./customer-ledger.repository";
import { CustomerLedgerService } from "./customer-ledger.service";
import { CustomerLedgerController } from "./customer-ledger.controller";

@Module({
  imports: [UsersModule, CustomersModule],
  providers: [CustomerLedgerRepository, CustomerLedgerService],
  controllers: [CustomerLedgerController],
  exports: [CustomerLedgerService, CustomerLedgerRepository],
})
export class CustomerLedgerModule {}
