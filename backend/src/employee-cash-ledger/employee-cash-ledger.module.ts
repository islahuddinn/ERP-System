import { Module } from "@nestjs/common";
import { UsersModule } from "../users/users.module";
import { EmployeeModule } from "../hr/employee/employee.module";
import { EmployeeCashLedgerRepository } from "./employee-cash-ledger.repository";
import { EmployeeCashLedgerService } from "./employee-cash-ledger.service";
import { EmployeeCashLedgerController } from "./employee-cash-ledger.controller";

@Module({
  imports: [UsersModule, EmployeeModule],
  providers: [EmployeeCashLedgerRepository, EmployeeCashLedgerService],
  controllers: [EmployeeCashLedgerController],
  exports: [EmployeeCashLedgerService, EmployeeCashLedgerRepository],
})
export class EmployeeCashLedgerModule {}
