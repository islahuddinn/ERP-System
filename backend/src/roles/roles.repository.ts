import { Injectable } from "@nestjs/common";
import { Permission, Prisma, Role } from "@prisma/tenant-client";
import { PrismaService } from "../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../common/dto/pagination.dto";
import {
  buildOrderBy,
  buildSearchFilter,
  getPaginationParams,
} from "../common/utils/pagination.helper";
import { RoleFiltersDto } from "./dto/role-filters.dto";
import { ROLE_INCLUDE } from "./utils/constants";
import { RoleDetail } from "./utils/types";

// Sortable columns exposed to the Roles list. Relation-count keys use dot notation
// resolved by `buildOrderBy`:
//   "rolePermissions._count" -> { rolePermissions: { _count } }  (Permissions column)
//   "users._count"           -> { users: { _count } }            (Users column)
const ROLE_SORTABLE_FIELDS = [
  "name",
  "description",
  "isSystem",
  "rolePermissions._count",
  "users._count",
];

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async dropdown(): Promise<{ id: string; name: string; isSystem: boolean }[]> {
    return this.prisma.role.findMany({
      where: { isActive: true, name: { not: "Admin" } },
      select: { id: true, name: true, isSystem: true },
      orderBy: { name: "asc" },
    });
  }

  async findAll(roleFiltersDto: RoleFiltersDto): Promise<PaginatedResponse<RoleDetail>> {
    const { search, sortBy, sortOrder, page = 1, limit = 10, isSystem } = roleFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.RoleWhereInput = { isActive: true, name: { not: "Admin" } };

    if (search) {
      where.OR = buildSearchFilter(search, ["name", "description"]);
    }

    if (isSystem !== undefined) {
      where.isSystem = isSystem;
    }

    // Honour an explicit, whitelisted sort; otherwise fall back to system roles first, then name.
    const orderBy =
      sortBy && ROLE_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : [{ isSystem: "desc" as const }, { name: "asc" as const }];

    const [data, total] = await Promise.all([
      this.prisma.role.findMany({ where, skip, take, include: ROLE_INCLUDE, orderBy }),
      this.prisma.role.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findById(roleId: string): Promise<RoleDetail | null> {
    return this.prisma.role.findUnique({ where: { id: roleId }, include: ROLE_INCLUDE });
  }

  async create(data: Prisma.RoleCreateInput): Promise<RoleDetail> {
    return this.prisma.role.create({ data, include: ROLE_INCLUDE });
  }

  async update(roleId: string, data: Prisma.RoleUpdateInput): Promise<RoleDetail> {
    return this.prisma.role.update({ where: { id: roleId }, data, include: ROLE_INCLUDE });
  }

  async delete(roleId: string): Promise<void> {
    await this.prisma.role.delete({ where: { id: roleId } });
  }

  async updatePermissions(roleId: string, permissionIds: string[]): Promise<RoleDetail> {
    return this.prisma.role.update({
      where: { id: roleId },
      data: {
        rolePermissions: {
          deleteMany: {},
          createMany: {
            data: permissionIds.map((permissionId) => ({ permissionId })),
            skipDuplicates: true,
          },
        },
      },
      include: ROLE_INCLUDE,
    });
  }

  async validatePermissionIds(permissionIds: string[]): Promise<Permission[]> {
    return this.prisma.permission.findMany({ where: { id: { in: permissionIds } } });
  }

  async hasUsers(roleId: string): Promise<boolean> {
    const count = await this.prisma.user.count({ where: { roleId } });
    return count > 0;
  }
}
