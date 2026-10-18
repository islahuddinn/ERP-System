import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { EmployeeModule } from "../../hr/employee/employee.module";
import { BranchModule } from "../branch/branch.module";
import { BranchStockModule } from "../branch-stock/branch-stock.module";
import { FactoryStockModule } from "../factory-stock/factory-stock.module";
import { BranchStockTransfersRepository } from "./branch-stock-transfers.repository";
import { BranchStockTransfersService } from "./branch-stock-transfers.service";
import { BranchStockTransfersController } from "./branch-stock-transfers.controller";

@Module({
  imports: [
    AuditModule,
    UsersModule,
    EmployeeModule,
    BranchModule,
    BranchStockModule,
    FactoryStockModule,
  ],
  providers: [BranchStockTransfersRepository, BranchStockTransfersService],
  controllers: [BranchStockTransfersController],
  exports: [BranchStockTransfersService],
})
export class BranchStockTransfersModule {}
