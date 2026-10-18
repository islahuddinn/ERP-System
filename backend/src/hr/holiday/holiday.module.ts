import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { HrSettingsModule } from "../hr-settings/hr-settings.module";
import { HolidayRepository } from "./holiday.repository";
import { HolidayService } from "./holiday.service";
import { HolidayController } from "./holiday.controller";

@Module({
  imports: [AuditModule, UsersModule, HrSettingsModule],
  providers: [HolidayRepository, HolidayService],
  controllers: [HolidayController],
  exports: [HolidayService],
})
export class HolidayModule {}
