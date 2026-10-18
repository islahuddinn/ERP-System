import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { PaginatedResponse } from "../common/dto/pagination.dto";
import { handlePrismaUniqueError } from "../common/reuseable-functions/handlePrismaUniqueError";
import { AuditContextService } from "../audit/audit-context.service";
import { PermissionsService } from "../users/permissions/permissions.service";
import { RolesRepository } from "./roles.repository";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { AssignPermissionsDto } from "./dto/assign-permissions.dto";
import { RoleFiltersDto } from "./dto/role-filters.dto";
import { RoleDetail } from "./utils/types";

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly permissionsService: PermissionsService,
    private readonly auditContext: AuditContextService,
  ) {}

  async listRoles(roleFiltersDto: RoleFiltersDto): Promise<PaginatedResponse<RoleDetail>> {
    return this.rolesRepository.findAll(roleFiltersDto);
  }

  async dropdown(): Promise<{ id: string; name: string; isSystem: boolean }[]> {
    return this.rolesRepository.dropdown();
  }

  async getRole(roleId: string): Promise<RoleDetail> {
    return this.checkExistence(roleId);
  }

  async createRole(createRoleDto: CreateRoleDto): Promise<RoleDetail> {
    const { name, description, permissionIds = [] } = createRoleDto;

    if (permissionIds.length > 0) {
      await this.validatePermissions(permissionIds);
    }

    const payload: Prisma.RoleCreateInput = {
      name,
      description: description ?? null,
      ...(permissionIds.length > 0 && {
        rolePermissions: {
          createMany: {
            data: permissionIds.map((permissionId) => ({ permissionId })),
            skipDuplicates: true,
          },
        },
      }),
    };

    try {
      return await this.rolesRepository.create(payload);
    } catch (error) {
      handlePrismaUniqueError(error, "A role with this name already exists");
    }
  }

  async updateRole(roleId: string, updateRoleDto: UpdateRoleDto): Promise<RoleDetail> {
    const role = await this.checkExistence(roleId);

    if (role.name === "Admin") {
      throw new BadRequestException("Admin role cannot be modified");
    }

    const { name, description } = updateRoleDto;

    const updateData: Prisma.RoleUpdateInput = {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
    };

    // Capture the pre-update state so the @Auditable interceptor can diff old vs new;
    // without this the interceptor sees no old value and skips the UPDATE audit log.
    this.auditContext.setOldValue(role);

    try {
      return await this.rolesRepository.update(roleId, updateData);
    } catch (error) {
      handlePrismaUniqueError(error, "A role with this name already exists");
    }
  }

  async deleteRole(roleId: string): Promise<void> {
    const role = await this.checkExistence(roleId);

    if (role.isSystem) {
      throw new BadRequestException("System roles cannot be deleted");
    }

    if (await this.rolesRepository.hasUsers(roleId)) {
      throw new BadRequestException(
        "Cannot delete a role that is assigned to users. Reassign users first",
      );
    }

    await this.rolesRepository.delete(roleId);
  }

  async assignPermissions(
    roleId: string,
    assignPermissionsDto: AssignPermissionsDto,
  ): Promise<RoleDetail> {
    const role = await this.checkExistence(roleId);

    if (role.name === "Admin") {
      throw new BadRequestException(
        "Admin role permissions are managed automatically and cannot be modified",
      );
    }

    const { permissionIds } = assignPermissionsDto;

    if (permissionIds.length > 0) {
      await this.validatePermissions(permissionIds);
    }

    this.auditContext.setOldValue(role);

    const updated = await this.rolesRepository.updatePermissions(roleId, permissionIds);

    /**
     * Audit logs for Updating Role's Permissions
     */
    const oldNames = new Set(role.rolePermissions.map((rp) => rp.permission.name));
    const newNames = new Set(updated.rolePermissions.map((rp) => rp.permission.name));

    this.auditContext.setMetadata({
      added: [...newNames].filter((n) => !oldNames.has(n)),
      removed: [...oldNames].filter((n) => !newNames.has(n)),
    });

    await this.permissionsService.invalidateRolePermissions(roleId);

    return updated;
  }

  async checkExistence(roleId: string): Promise<RoleDetail> {
    const role = await this.rolesRepository.findById(roleId);

    if (!role) throw new NotFoundException("Role not found");

    return role;
  }

  private async validatePermissions(permissionIds: string[]): Promise<void> {
    const found = await this.rolesRepository.validatePermissionIds(permissionIds);

    if (found?.length !== permissionIds?.length) {
      throw new NotFoundException("One or more permission IDs not found");
    }
  }
}
