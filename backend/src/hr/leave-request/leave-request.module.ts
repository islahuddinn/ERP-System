import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { HrSettingsModule } from "../hr-settings/hr-settings.module";
import { HolidayModule } from "../holiday/holiday.module";
import { LeaveRequestRepository } from "./leave-request.repository";
import { LeaveRequestService } from "./leave-request.service";
import { LeaveRequestController } from "./leave-request.controller";

@Module({
  imports: [AuditModule, UsersModule, HrSettingsModule, HolidayModule],
  providers: [LeaveRequestRepository, LeaveRequestService],
  controllers: [LeaveRequestController],
  exports: [LeaveRequestService],
})
export class LeaveRequestModule {}
