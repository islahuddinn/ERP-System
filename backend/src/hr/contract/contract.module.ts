import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { ContractRepository } from "./contract.repository";
import { SalaryRevisionRepository } from "./salary-revision.repository";
import { AllowanceRepository } from "./allowance.repository";
import { ContractService } from "./contract.service";
import { SalaryRevisionService } from "./salary-revision.service";
import { AllowanceService } from "./allowance.service";
import { ContractController } from "./contract.controller";

@Module({
  imports: [AuditModule, UsersModule],
  providers: [
    ContractRepository,
    SalaryRevisionRepository,
    AllowanceRepository,
    ContractService,
    SalaryRevisionService,
    AllowanceService,
  ],
  controllers: [ContractController],
  exports: [ContractService, SalaryRevisionService, AllowanceService],
})
export class ContractModule {}
