import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { UsersModule } from "../users/users.module";
import { EmployeeModule } from "../hr/employee/employee.module";
import { BranchModule } from "../sales-management/branch/branch.module";
import { BranchStockTransfersModule } from "../sales-management/branch-stock-transfers/branch-stock-transfers.module";
import { EmployeeCashTransferRepository } from "./employee-cash-transfer.repository";
import { EmployeeCashTransferService } from "./employee-cash-transfer.service";
import { EmployeeCashTransferController } from "./employee-cash-transfer.controller";

@Module({
  imports: [AuditModule, UsersModule, EmployeeModule, BranchModule, BranchStockTransfersModule],
  providers: [EmployeeCashTransferRepository, EmployeeCashTransferService],
  controllers: [EmployeeCashTransferController],
  exports: [EmployeeCashTransferService],
})
export class EmployeeCashTransferModule {}
