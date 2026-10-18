import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { EmployeeModule } from "../../hr/employee/employee.module";
import { CustomerDeliveriesModule } from "../customer-deliveries/customer-deliveries.module";
import { SalesPersonAssignmentsModule } from "../../sales-management/sales-person-assignments/sales-person-assignments.module";
import { BranchStockModule } from "../../sales-management/branch-stock/branch-stock.module";
import { CustomerReturnsRepository } from "./customer-returns.repository";
import { CustomerReturnsService } from "./customer-returns.service";
import { CustomerReturnsController } from "./customer-returns.controller";

@Module({
  imports: [
    AuditModule,
    UsersModule,
    EmployeeModule,
    CustomerDeliveriesModule,
    SalesPersonAssignmentsModule,
    BranchStockModule,
  ],
  providers: [CustomerReturnsRepository, CustomerReturnsService],
  controllers: [CustomerReturnsController],
  exports: [CustomerReturnsService],
})
export class CustomerReturnsModule {}
