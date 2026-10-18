import { Injectable } from "@nestjs/common";
import { Prisma, User, LoginAccess } from "@prisma/tenant-client";
import {
  buildOrderBy,
  buildSearchFilter,
  getPaginationParams,
} from "src/common/utils/pagination.helper";
import {
  buildPaginatedResponse,
  PaginatedResponse,
  SortOrder,
} from "src/common/dto/pagination.dto";
import { UserFiltersDto } from "./dto/user-filters.dto";
import { PrismaService } from "../prisma/prisma.service";

const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
  phone: true,
  roleId: true,
  loginAccess: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(filters: UserFiltersDto): Promise<PaginatedResponse<User>> {
    const { page = 1, limit = 10, roleId, loginAccess, search, sortBy, sortOrder } = filters;

    const where: Prisma.UserWhereInput = { deletedAt: null };
    const { skip, take } = getPaginationParams(page, limit);

    if (roleId) where.roleId = roleId;
    if (loginAccess) where.loginAccess = loginAccess;

    if (search) {
      where.OR = buildSearchFilter(search, ["firstName", "lastName", "email"]);
    }

    const orderBy = buildOrderBy(sortBy || "createdAt", sortOrder || SortOrder.DESC);

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ where, orderBy, skip, take, select: USER_SELECT }) as any,
      this.prisma.user.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findOne(userId: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: USER_SELECT,
    }) as any;
  }

  async findOneWithEmployee(id: string) {
    return this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: {
        ...USER_SELECT,
        role: { select: { id: true, name: true } },
        employee: {
          select: {
            id: true,
            employeeCode: true,
            dateOfJoining: true,
            status: true,
            contracts: {
              where: { status: "ACTIVE" },
              take: 1,
              select: {
                department: { select: { id: true, name: true } },
                position: { select: { id: true, title: true } },
              },
            },
          },
        },
      },
    });
  }

  async update(userId: string, data: Prisma.UserUpdateInput): Promise<User> {
    return this.prisma.user.update({ where: { id: userId }, data, select: USER_SELECT }) as any;
  }

  async softDelete(userId: string): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date(), loginAccess: LoginAccess.DISABLED },
      select: USER_SELECT,
    }) as any;
  }

  async checkExistence(where: Prisma.UserWhereUniqueInput): Promise<User | null> {
    return this.prisma.user.findFirst({ where: { ...where, deletedAt: null } });
  }

  async dropdown(roleId?: string) {
    return this.prisma.user.findMany({
      where: { loginAccess: LoginAccess.ENABLED, deletedAt: null, ...(roleId && { roleId }) },
      orderBy: { firstName: "asc" },
      select: { id: true, firstName: true, lastName: true, email: true, roleId: true },
    });
  }
}
