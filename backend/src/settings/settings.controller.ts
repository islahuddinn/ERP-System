import { Controller, Get, Patch, Body, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { SettingsService } from "./settings.service";
import { UpdateAccountSettingsDto } from "./dto/settings.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient } from "@prisma/tenant-client";
import { TenantRequest } from "../common/middleware/tenant-context.middleware";

@ApiTags("Settings")
@Controller("settings")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get("account")
  @ApiOperation({ summary: "Get account settings" })
  @ApiResponse({
    status: 200,
    description: "Account settings retrieved successfully",
  })
  async getAccountSettings(@TenantClient() tenantClient: PrismaClient, @Req() req: TenantRequest) {
    return this.settingsService.getAccountSettings(tenantClient, req.tenantId);
  }

  @Patch("account")
  @ApiOperation({ summary: "Update account settings" })
  @ApiResponse({
    status: 200,
    description: "Account settings updated successfully",
  })
  async updateAccountSettings(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Body() updateDto: UpdateAccountSettingsDto,
  ) {
    return this.settingsService.updateAccountSettings(tenantClient, req.tenantId, updateDto);
  }
}
