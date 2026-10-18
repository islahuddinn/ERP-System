import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuditModule } from "@prisma/tenant-client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { Auditable } from "../audit/decorators/auditable.decorator";
import { RolesService } from "./roles.service";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { AssignPermissionsDto } from "./dto/assign-permissions.dto";
import { RoleFiltersDto } from "./dto/role-filters.dto";

@ApiTags("Roles")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("roles")
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermission("roles.read")
  @ApiOperation({ summary: "List all roles with pagination and search" })
  listRoles(@Query() roleFiltersDto: RoleFiltersDto) {
    return this.rolesService.listRoles(roleFiltersDto);
  }

  @Get("dropdown")
  @RequirePermission("roles.read")
  @ApiOperation({ summary: "Dropdown list of active roles — id, name, isSystem only" })
  dropdown() {
    return this.rolesService.dropdown();
  }

  @Get(":roleId")
  @RequirePermission("roles.read")
  @ApiOperation({ summary: "Get role by ID with its permissions" })
  getRole(@Param("roleId") roleId: string) {
    return this.rolesService.getRole(roleId);
  }

  @Post()
  @Auditable({ module: AuditModule.ROLES })
  @RequirePermission("roles.create")
  @ApiOperation({ summary: "Create a new role with optional permissions" })
  createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.rolesService.createRole(createRoleDto);
  }

  @Patch(":roleId")
  @Auditable({ module: AuditModule.ROLES })
  @RequirePermission("roles.update")
  @ApiOperation({ summary: "Update role name or description" })
  updateRole(@Param("roleId") roleId: string, @Body() updateRoleDto: UpdateRoleDto) {
    return this.rolesService.updateRole(roleId, updateRoleDto);
  }

  @Delete(":roleId")
  @RequirePermission("roles.delete")
  @ApiOperation({ summary: "Delete a role — blocked if system role or has users assigned" })
  async deleteRole(@Param("roleId") roleId: string) {
    await this.rolesService.deleteRole(roleId);
    return { message: "Role deleted successfully" };
  }

  @Put(":roleId/permissions")
  @Auditable({ module: AuditModule.ROLES })
  @RequirePermission("roles.update")
  @ApiOperation({ summary: "Replace all permissions for a role" })
  assignPermissions(
    @Param("roleId") roleId: string,
    @Body() assignPermissionsDto: AssignPermissionsDto,
  ) {
    return this.rolesService.assignPermissions(roleId, assignPermissionsDto);
  }
}
