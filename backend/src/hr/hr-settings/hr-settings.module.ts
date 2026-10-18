import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { HrSettingsRepository } from "./hr-settings.repository";
import { HrSettingsService } from "./hr-settings.service";
import { HrSettingsController } from "./hr-settings.controller";

@Module({
  imports: [AuditModule, UsersModule],
  providers: [HrSettingsRepository, HrSettingsService],
  controllers: [HrSettingsController],
  exports: [HrSettingsService],
})
export class HrSettingsModule {}
