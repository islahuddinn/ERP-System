import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { ContractModule } from "../contract/contract.module";
import { HrSettingsModule } from "../hr-settings/hr-settings.module";
import { LoanRequestRepository } from "./loan-request.repository";
import { LoanRequestService } from "./loan-request.service";
import { LoanRequestController } from "./loan-request.controller";

@Module({
  imports: [AuditModule, UsersModule, ContractModule, HrSettingsModule],
  providers: [LoanRequestRepository, LoanRequestService],
  controllers: [LoanRequestController],
  exports: [LoanRequestService],
})
export class LoanRequestModule {}
