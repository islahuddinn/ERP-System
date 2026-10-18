import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { UpdateUserDto } from "./dto/update-user.dto";
import { UserFiltersDto } from "./dto/user-filters.dto";
import { ChangeUserStatusDto } from "./dto/change-user-status.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ChangeUserRoleDto } from "./dto/change-user-role.dto";
import { UserDropdownDto } from "./dto/user-dropdown.dto";
import { PermissionsService } from "./permissions/permissions.service";
import { RequestWithUser } from "src/common/interfaces";
import { handlePrismaUniqueError } from "src/common/reuseable-functions/handlePrismaUniqueError";
import { hashPassword } from "src/common/reuseable-functions/hashPassword";
import { verifyPassword } from "src/common/reuseable-functions/verifyPassword";
import { UsersRepository } from "./users.repository";

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly permissionsService: PermissionsService,
  ) {}

  async findAll(filters: UserFiltersDto) {
    return this.usersRepository.findAll(filters);
  }

  async findOne(userId: string) {
    const user = await this.usersRepository.findOne(userId);

    if (!user) throw new NotFoundException(`User not found`);

    return user;
  }

  async getCurrentUser(req: RequestWithUser) {
    return this.usersRepository.findOneWithEmployee(req.user.id);
  }

  async update(userId: string, updateUserDto: UpdateUserDto, req: RequestWithUser) {
    await this.checkExistence({ id: userId });

    const { email, ...rest } = updateUserDto;

    const updateData: Prisma.UserUpdateInput = { ...rest };

    if (email) updateData.email = email;

    try {
      return await this.usersRepository.update(userId, updateData);
    } catch (error) {
      handlePrismaUniqueError(error, this.describeUniqueConflict(error, "phone", "email"));
    }
  }

  async remove(userId: string, req: RequestWithUser) {
    await this.checkExistence({ id: userId });

    if (userId === req.user.id) {
      throw new BadRequestException(`You cannot delete your own account`);
    }

    await this.usersRepository.softDelete(userId);
    return { message: `User deleted successfully.` };
  }

  async updateStatus(userId: string, dto: ChangeUserStatusDto, req: RequestWithUser) {
    await this.checkExistence({ id: userId });

    if (userId === req.user.id) {
      throw new BadRequestException(`You cannot update your own login access`);
    }

    return this.usersRepository.update(userId, { loginAccess: dto.loginAccess });
  }

  async updateRole(userId: string, changeUserRoleDto: ChangeUserRoleDto, req: RequestWithUser) {
    await this.checkExistence({ id: userId });

    const { roleId } = changeUserRoleDto;

    if (userId === req.user.id) {
      throw new BadRequestException(`You cannot update your own role`);
    }

    return this.usersRepository.update(userId, { role: { connect: { id: roleId } } });
  }

  async resetPassword(userId: string, { newPassword }: ResetPasswordDto) {
    const user = await this.checkExistence({ id: userId });

    await this.ensureNewPasswordIsDifferent(newPassword, user.password);

    const hashedPassword = await hashPassword(newPassword);

    // Stamp the change so JWTs issued before now are rejected (force logout, #13).
    await this.usersRepository.update(userId, { password: hashedPassword, passwordChangedAt: new Date() });

    return { message: `Password reset successfully` };
  }

  async updateMyProfile(updateUserDto: UpdateUserDto, req: RequestWithUser) {
    const { id: userId } = req.user;

    try {
      return await this.usersRepository.update(userId, updateUserDto);
    } catch (error) {
      // Report whichever field actually caused the unique-constraint violation.
      // Previously this always said "email", so restoring a phone number that
      // collided with another user's (or any other real phone duplicate) was
      // wrongly reported as an email conflict (#18).
      handlePrismaUniqueError(error, this.describeUniqueConflict(error, "phone", "email"));
    }
  }

  /**
   * Builds a friendly "A user with this <field> already exists" message for a
   * P2002 error, naming the field that actually triggered it (falls back to
   * `fallbackField` when the conflicting field can't be determined).
   */
  private describeUniqueConflict(
    error: unknown,
    ...candidateFields: string[]
  ): string {
    const target =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002"
        ? error.meta?.target
        : undefined;

    const targetFields = Array.isArray(target) ? target : [target].filter(Boolean);

    const matchedField =
      candidateFields.find((field) => targetFields.includes(field)) ??
      candidateFields[candidateFields.length - 1];

    const fieldLabel = matchedField === "phone" ? "phone number" : matchedField;

    return `A user with this ${fieldLabel} already exists`;
  }

  async changeMyPassword(changePasswordDto: ChangePasswordDto, req: RequestWithUser) {
    const { id: userId } = req.user;

    const { currentPassword, newPassword } = changePasswordDto;

    const { password } = await this.checkExistence({ id: userId });

    const isValid = await verifyPassword(currentPassword, password);

    if (!isValid) throw new BadRequestException(`Current password is incorrect`);

    await this.ensureNewPasswordIsDifferent(newPassword, password);

    const hashedPassword = await hashPassword(newPassword);

    // Stamp the change so JWTs issued before now are rejected (force logout, #13).
    await this.usersRepository.update(userId, { password: hashedPassword, passwordChangedAt: new Date() });

    return { message: `Password changed successfully` };
  }

  // Blocks setting a new password identical to the one already on file (QA #15).
  // Runs for both self-service change and admin reset; safely skips users that
  // have no password set yet (nullable in the schema).
  private async ensureNewPasswordIsDifferent(
    newPassword: string,
    currentHashedPassword: string | null,
  ): Promise<void> {
    if (!currentHashedPassword) return;

    const isSameAsCurrent = await verifyPassword(newPassword, currentHashedPassword);

    if (isSameAsCurrent) {
      throw new BadRequestException(`New password must be different from the current password`);
    }
  }

  async getMyPermissions(req: RequestWithUser) {
    const { id: loggedInUserId, roleId } = req.user;
    const permissions = await this.permissionsService.getVisiblePermissionsByRoleIdGroupedByModule(
      roleId,
    );

    return { userId: loggedInUserId, roleId, permissions };
  }

  async getUserPermissions(userId: string) {
    const user = await this.checkExistence({ id: userId });

    // This drives the "My Permissions" display only — hide the same
    // non-implemented modules/keys the Add Role list hides, so the display is
    // fully API-driven (the frontend renders this verbatim). The login/sidebar
    // permission payload is a separate path and stays unfiltered.
    const permissions = await this.permissionsService.getVisiblePermissionsByRoleIdGroupedByModule(
      user.roleId,
    );

    return { userId, roleId: user.roleId, permissions };
  }

  async dropdown(dto: UserDropdownDto) {
    return this.usersRepository.dropdown(dto.roleId);
  }

  async hasPermission(userId: string, permissionName: string): Promise<boolean> {
    return this.permissionsService.hasPermission(userId, permissionName);
  }

  async checkExistence(query: Prisma.UserWhereUniqueInput) {
    const found = await this.usersRepository.checkExistence(query);

    if (!found) throw new NotFoundException(`User not found.`);

    return found;
  }
}
