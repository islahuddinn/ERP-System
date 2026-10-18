import {
  Controller,
  Get,
  Body,
  Param,
  Delete,
  Put,
  UseGuards,
  Query,
  Patch,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { AuditModule } from "@prisma/tenant-client";
import { Auditable } from "../audit/decorators/auditable.decorator";
import { UsersService } from "./users.service";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserFiltersDto } from "./dto/user-filters.dto";
import { ChangeUserStatusDto } from "./dto/change-user-status.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ChangeUserRoleDto } from "./dto/change-user-role.dto";
import { UserDropdownDto } from "./dto/user-dropdown.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "./guards/permissions.guard";
import { RequirePermission } from "./decorators/permissions.decorator";
import { RequestWithUser } from "src/common/interfaces";

@ApiTags("Users")
@Controller("users")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── Self-service (any logged-in user) ───────────────────────────────────

  @Get("me")
  @ApiOperation({ summary: "Get current user profile including linked employee record" })
  getMe(@Req() req: RequestWithUser) {
    return this.usersService.getCurrentUser(req);
  }

  @Patch("me")
  @ApiOperation({ summary: "Update own profile (name, phone, email)" })
  updateMe(@Req() req: RequestWithUser, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.updateMyProfile(updateUserDto, req);
  }

  @Put("me/password")
  @ApiOperation({ summary: "Change own password (requires current password verification)" })
  changeMyPassword(@Req() req: RequestWithUser, @Body() dto: ChangePasswordDto) {
    return this.usersService.changeMyPassword(dto, req);
  }

  @Get("me/permissions")
  @ApiOperation({ summary: "Get own effective permissions" })
  getMyPermissions(@Req() req: RequestWithUser) {
    return this.usersService.getMyPermissions(req);
  }

  // ── Admin operations ─────────────────────────────────────────────────────

  @Get()
  @RequirePermission("users.read")
  @ApiOperation({ summary: "List all users with filters and pagination" })
  findAll(@Query() filters: UserFiltersDto) {
    return this.usersService.findAll(filters);
  }

  @Get("dropdown")
  @RequirePermission("users.read")
  @ApiOperation({ summary: "Get minimal active user list for dropdowns, filterable by role" })
  dropdown(@Query() dto: UserDropdownDto) {
    return this.usersService.dropdown(dto);
  }

  @Get(":userId")
  @RequirePermission("users.read")
  @ApiOperation({ summary: "Get a user by ID" })
  findOne(@Param("userId") userId: string) {
    return this.usersService.findOne(userId);
  }

  @Patch(":userId")
  @RequirePermission("users.update")
  @ApiOperation({ summary: "Update a user's profile" })
  @Auditable({ module: AuditModule.USERS })
  update(@Param("userId") userId: string, @Body() dto: UpdateUserDto, @Req() req: RequestWithUser) {
    return this.usersService.update(userId, dto, req);
  }

  @Delete(":userId")
  @RequirePermission("users.delete")
  @ApiOperation({
    summary: "Soft delete a user (disables login access and excludes them from listings)",
  })
  @Auditable({ module: AuditModule.USERS })
  remove(@Param("userId") userId: string, @Req() req: RequestWithUser) {
    return this.usersService.remove(userId, req);
  }

  @Put(":userId/status")
  @RequirePermission("users.update")
  @ApiOperation({ summary: "Enable or disable a user's login access" })
  @Auditable({ module: AuditModule.USERS })
  updateStatus(
    @Param("userId") userId: string,
    @Body() dto: ChangeUserStatusDto,
    @Req() req: RequestWithUser,
  ) {
    return this.usersService.updateStatus(userId, dto, req);
  }

  @Put(":userId/password")
  @RequirePermission("users.update")
  @ApiOperation({ summary: "Reset a user's password (by admin)" })
  resetPassword(@Param("userId") userId: string, @Body() dto: ResetPasswordDto) {
    return this.usersService.resetPassword(userId, dto);
  }

  @Put(":userId/role")
  @RequirePermission("users.manage_roles")
  @ApiOperation({ summary: "Change a user's role" })
  @Auditable({ module: AuditModule.USERS })
  changeRole(
    @Param("userId") userId: string,
    @Body() dto: ChangeUserRoleDto,
    @Req() req: RequestWithUser,
  ) {
    return this.usersService.updateRole(userId, dto, req);
  }

  @Get(":userId/permissions")
  @RequirePermission("users.read")
  @ApiOperation({ summary: "Get a user's effective permissions" })
  getUserPermissions(@Param("userId") userId: string) {
    return this.usersService.getUserPermissions(userId);
  }
}
