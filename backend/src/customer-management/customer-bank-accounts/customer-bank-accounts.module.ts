import { Module } from "@nestjs/common";
import { CustomerBankAccountsController } from "./customer-bank-accounts.controller";
import { CustomerBankAccountsService } from "./customer-bank-accounts.service";
import { CustomerBankAccountsRepository } from "./customer-bank-accounts.repository";
import { CustomersModule } from "../customers/customers.module";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";

@Module({
  imports: [AuditModule, UsersModule, CustomersModule],
  controllers: [CustomerBankAccountsController],
  providers: [CustomerBankAccountsService, CustomerBankAccountsRepository],
  exports: [CustomerBankAccountsService],
})
export class CustomerBankAccountsModule {}
