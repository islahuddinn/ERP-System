import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { CustomersModule } from "../customers/customers.module";
import { EmployeeModule } from "../../hr/employee/employee.module";
import { ProductsModule } from "../../product-management/products/products.module";
import { CustomerOrdersModule } from "../customer-orders/customer-orders.module";
import { SalesPersonAssignmentsModule } from "../../sales-management/sales-person-assignments/sales-person-assignments.module";
import { BranchStockModule } from "../../sales-management/branch-stock/branch-stock.module";
import { CustomerDeliveriesRepository } from "./customer-deliveries.repository";
import { CustomerDeliveriesService } from "./customer-deliveries.service";
import { CustomerDeliveriesController } from "./customer-deliveries.controller";

@Module({
  imports: [
    AuditModule,
    UsersModule,
    CustomersModule,
    EmployeeModule,
    ProductsModule,
    CustomerOrdersModule,
    SalesPersonAssignmentsModule,
    BranchStockModule,
  ],
  providers: [CustomerDeliveriesRepository, CustomerDeliveriesService],
  controllers: [CustomerDeliveriesController],
  exports: [CustomerDeliveriesService],
})
export class CustomerDeliveriesModule {}
