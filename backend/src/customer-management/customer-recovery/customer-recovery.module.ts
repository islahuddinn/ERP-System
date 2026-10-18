import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { CustomersModule } from "../customers/customers.module";
import { EmployeeModule } from "../../hr/employee/employee.module";
import { CustomerRecoveryRepository } from "./customer-recovery.repository";
import { CustomerRecoveryService } from "./customer-recovery.service";
import { CustomerRecoveryController } from "./customer-recovery.controller";

@Module({
  imports: [AuditModule, UsersModule, CustomersModule, EmployeeModule],
  providers: [CustomerRecoveryRepository, CustomerRecoveryService],
  controllers: [CustomerRecoveryController],
  exports: [CustomerRecoveryService],
})
export class CustomerRecoveryModule {}
