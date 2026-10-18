import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { ProductsModule } from "../../product-management/products/products.module";
import { EmployeeModule } from "../../hr/employee/employee.module";
import { BranchModule } from "../branch/branch.module";
import { BranchProductPricesModule } from "../branch-product-prices/branch-product-prices.module";
import { BranchStockModule } from "../branch-stock/branch-stock.module";
import { FactoryStockModule } from "../factory-stock/factory-stock.module";
import { BranchStockRequestsRepository } from "./branch-stock-requests.repository";
import { BranchStockRequestsService } from "./branch-stock-requests.service";
import { BranchStockRequestsController } from "./branch-stock-requests.controller";

@Module({
  imports: [
    AuditModule,
    UsersModule,
    ProductsModule,
    EmployeeModule,
    BranchModule,
    BranchProductPricesModule,
    BranchStockModule,
    FactoryStockModule,
  ],
  providers: [BranchStockRequestsRepository, BranchStockRequestsService],
  controllers: [BranchStockRequestsController],
  exports: [BranchStockRequestsService],
})
export class BranchStockRequestsModule {}
