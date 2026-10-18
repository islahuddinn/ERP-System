import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuditModule } from "@prisma/tenant-client";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { Auditable } from "../../audit/decorators/auditable.decorator";
import { HrSettingsService } from "./hr-settings.service";
import { UpdateHrSettingsDto } from "./dto/update-hr-settings.dto";

@ApiTags("HR - Settings")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("hr/settings")
export class HrSettingsController {
  constructor(private readonly hrSettingsService: HrSettingsService) {}

  @Get()
  @RequirePermission("hr-settings.view")
  @ApiOperation({ summary: "Get the tenant's HR settings" })
  getSettings() {
    return this.hrSettingsService.getSettings();
  }

  @Patch()
  @RequirePermission("hr-settings.manage")
  @ApiOperation({ summary: "Update the tenant's HR settings" })
  @Auditable({ module: AuditModule.HR_SETTINGS })
  updateSettings(@Body() updateHrSettingsDto: UpdateHrSettingsDto) {
    return this.hrSettingsService.updateSettings(updateHrSettingsDto);
  }
}
