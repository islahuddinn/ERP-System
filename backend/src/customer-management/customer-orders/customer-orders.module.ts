import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { CustomersModule } from "../customers/customers.module";
import { EmployeeModule } from "../../hr/employee/employee.module";
import { ProductsModule } from "../../product-management/products/products.module";
import { SalesPersonAssignmentsModule } from "../../sales-management/sales-person-assignments/sales-person-assignments.module";
import { BranchProductPricesModule } from "../../sales-management/branch-product-prices/branch-product-prices.module";
import { CustomerOrdersRepository } from "./customer-orders.repository";
import { CustomerOrdersService } from "./customer-orders.service";
import { CustomerOrdersController } from "./customer-orders.controller";

@Module({
  imports: [
    AuditModule,
    UsersModule,
    CustomersModule,
    EmployeeModule,
    ProductsModule,
    SalesPersonAssignmentsModule,
    BranchProductPricesModule,
  ],
  providers: [CustomerOrdersRepository, CustomerOrdersService],
  controllers: [CustomerOrdersController],
  exports: [CustomerOrdersService, CustomerOrdersRepository],
})
export class CustomerOrdersModule {}
