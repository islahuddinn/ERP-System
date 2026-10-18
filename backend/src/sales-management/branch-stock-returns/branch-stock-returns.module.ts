import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { EmployeeModule } from "../../hr/employee/employee.module";
import { BranchModule } from "../branch/branch.module";
import { BranchStockModule } from "../branch-stock/branch-stock.module";
import { FactoryStockModule } from "../factory-stock/factory-stock.module";
import { BranchStockTransfersModule } from "../branch-stock-transfers/branch-stock-transfers.module";
import { BranchStockReturnsRepository } from "./branch-stock-returns.repository";
import { BranchStockReturnsService } from "./branch-stock-returns.service";
import { BranchStockReturnsController } from "./branch-stock-returns.controller";

@Module({
  imports: [
    AuditModule,
    UsersModule,
    EmployeeModule,
    BranchModule,
    BranchStockModule,
    FactoryStockModule,
    BranchStockTransfersModule,
  ],
  providers: [BranchStockReturnsRepository, BranchStockReturnsService],
  controllers: [BranchStockReturnsController],
  exports: [BranchStockReturnsService],
})
export class BranchStockReturnsModule {}
