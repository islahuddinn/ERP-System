import { Module } from "@nestjs/common";
import { UsersModule } from "../../users/users.module";
import { EmployeeModule } from "../../hr/employee/employee.module";
import { BranchModule } from "../branch/branch.module";
import { BranchLedgerRepository } from "./branch-ledger.repository";
import { BranchLedgerService } from "./branch-ledger.service";
import { BranchLedgerController } from "./branch-ledger.controller";

@Module({
  imports: [UsersModule, EmployeeModule, BranchModule],
  providers: [BranchLedgerRepository, BranchLedgerService],
  controllers: [BranchLedgerController],
  exports: [BranchLedgerRepository],
})
export class BranchLedgerModule {}
