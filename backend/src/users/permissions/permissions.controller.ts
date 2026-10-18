import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { PermissionsService } from "./permissions.service";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../guards/permissions.guard";
import { RequirePermission } from "../decorators/permissions.decorator";

@ApiTags("Permissions")
@Controller("permissions")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermission("roles.read")
  @ApiOperation({ summary: "Get all permissions grouped by module" })
  @ApiResponse({ status: 200, description: "Permissions retrieved successfully" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  getAllPermissions() {
    return this.permissionsService.getAllPermissions();
  }

  @Get("modules")
  @RequirePermission("roles.read")
  @ApiOperation({ summary: "Get all permission modules" })
  @ApiResponse({ status: 200, description: "Modules retrieved successfully" })
  @ApiResponse({ status: 403, description: "Forbidden" })
  getModules() {
    return this.permissionsService.getModules();
  }
}
