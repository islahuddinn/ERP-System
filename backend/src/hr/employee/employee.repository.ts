import { Injectable } from "@nestjs/common";
import { Employee, EmployeeDocument, Prisma } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import {
  buildOrderBy,
  buildSearchFilter,
  getPaginationParams,
} from "../../common/utils/pagination.helper";
import { EmployeeFiltersDto } from "./dto/employee-filters.dto";
import { EMPLOYEE_DETAIL_INCLUDE, EMPLOYEE_LIST_INCLUDE } from "./utils/constants";
import { EmployeeDetail, EmployeeListItem } from "./utils/types";
import { CreateEmployeeData, CreateUserData } from "./utils/interfaces";

const EMPLOYEE_SORTABLE_FIELDS = [
  "employeeCode",
  "dateOfJoining",
  "status",
  "createdAt",
  "updatedAt",
  // Nested user relation fields — buildOrderBy folds the dot path into the
  // nested shape Prisma requires ({ user: { firstName: "asc" } }).
  "user.firstName",
  "user.email",
];

@Injectable()
export class EmployeeRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    employeeFiltersDto: EmployeeFiltersDto,
  ): Promise<PaginatedResponse<EmployeeListItem>> {
    const { status, search, sortBy, sortOrder, page = 1, limit = 10 } = employeeFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);

    const where: Prisma.EmployeeWhereInput = {};

    if (search) {
      where.OR = [
        ...buildSearchFilter(search, ["employeeCode"]),
        { user: { OR: buildSearchFilter(search, ["firstName", "lastName", "email", "phone"]) } },
      ];
    }

    if (status) where.status = status;

    // Whitelist guards against Prisma validation errors (500) on arbitrary sortBy values
    const orderBy =
      sortBy && EMPLOYEE_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { createdAt: "desc" as const };

    const [data, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take,
        orderBy,
        include: EMPLOYEE_LIST_INCLUDE,
      }),
      this.prisma.employee.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async dropdown(): Promise<
    {
      id: string;
      employeeCode: string;
      user: { id: string; firstName: string; lastName: string } | null;
    }[]
  > {
    return this.prisma.employee.findMany({
      // Only active employees whose login access is enabled — disabled/suspended
      // accounts must not appear in attendance/leave employee pickers (#7).
      where: { status: "ACTIVE", user: { loginAccess: "ENABLED" } },
      select: {
        id: true,
        employeeCode: true,
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { employeeCode: "asc" },
    });
  }

  /** Branch distributors — any ACTIVE employee; login not required. */
  async distributorDropdown(): Promise<
    {
      id: string;
      employeeCode: string;
      user: { id: string; firstName: string; lastName: string; email: string | null } | null;
    }[]
  > {
    return this.prisma.employee.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        employeeCode: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { employeeCode: "asc" },
    });
  }

  async findById(employeeId: string): Promise<EmployeeDetail | null> {
    return this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: EMPLOYEE_DETAIL_INCLUDE,
    });
  }

  async findOne(employeeId: string): Promise<Employee | null> {
    return this.prisma.employee.findUnique({ where: { id: employeeId } });
  }

  async findByUserId(userId: string): Promise<{ id: string } | null> {
    return this.prisma.employee.findUnique({ where: { userId }, select: { id: true } });
  }

  async findByEmployeeCode(employeeCode: string): Promise<Employee | null> {
    return this.prisma.employee.findUnique({ where: { employeeCode } });
  }

  async createUserAndEmployee(
    userData: CreateUserData,
    employeeData: CreateEmployeeData,
  ): Promise<EmployeeDetail> {
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email ?? null,
          phone: userData.phone ?? null,
          password: userData.password ?? null,
          roleId: userData.roleId ?? null,
          loginAccess: userData.loginAccess,
        },
      });

      return tx.employee.create({
        data: { userId: user.id, ...employeeData },
        include: EMPLOYEE_DETAIL_INCLUDE,
      });
    });
  }

  async updateUser(userId: string, data: Prisma.UserUpdateInput): Promise<void> {
    await this.prisma.user.update({ where: { id: userId }, data });
  }

  async update(
    employeeId: string,
    data: Prisma.EmployeeUncheckedUpdateInput,
  ): Promise<EmployeeDetail> {
    return this.prisma.employee.update({
      where: { id: employeeId },
      data,
      include: EMPLOYEE_DETAIL_INCLUDE,
    });
  }

  async attachDocument(
    employeeId: string,
    documentType: string,
    fileUrl: string,
    createdById: string,
  ): Promise<EmployeeDocument> {
    return this.prisma.employeeDocument.create({
      data: { employeeId, documentType, fileUrl, createdById },
    });
  }
}
