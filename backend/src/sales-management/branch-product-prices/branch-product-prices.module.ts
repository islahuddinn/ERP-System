import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { ProductsModule } from "../../product-management/products/products.module";
import { EmployeeModule } from "../../hr/employee/employee.module";
import { BranchModule } from "../branch/branch.module";
import { PriceListsModule } from "../price-lists/price-lists.module";
import { BranchProductPricesRepository } from "./branch-product-prices.repository";
import { BranchProductPricesService } from "./branch-product-prices.service";
import { BranchProductPricesController } from "./branch-product-prices.controller";

@Module({
  imports: [AuditModule, UsersModule, ProductsModule, EmployeeModule, BranchModule, PriceListsModule],
  providers: [BranchProductPricesRepository, BranchProductPricesService],
  controllers: [BranchProductPricesController],
  exports: [BranchProductPricesService],
})
export class BranchProductPricesModule {}
