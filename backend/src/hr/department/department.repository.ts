import { Injectable } from "@nestjs/common";
import { Department, Prisma } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import {
  buildOrderBy,
  buildSearchFilter,
  getPaginationParams,
} from "../../common/utils/pagination.helper";
import { DepartmentFiltersDto } from "./dto/department-filters.dto";
import {
  DEPARTMENT_DETAIL_INCLUDE,
  DEPARTMENT_LIST_INCLUDE,
  DEPARTMENT_TREE_INCLUDE,
} from "./utils/constants";
import { DepartmentDetail, DepartmentWithEmployeeCount } from "./utils/types";

// Relation-backed sort keys use dot notation resolved by `buildOrderBy`:
//   "parent.name"       -> { parent: { name } }        (sort by parent department name)
//   "contracts._count"  -> { contracts: { _count } }   (sort by employee/contract count)
const DEPARTMENT_SORTABLE_FIELDS = [
  "name",
  "description",
  "createdAt",
  "updatedAt",
  "parent.name",
  "contracts._count",
];

@Injectable()
export class DepartmentRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    departmentFiltersDto: DepartmentFiltersDto,
  ): Promise<PaginatedResponse<DepartmentWithEmployeeCount>> {
    const { search, sortBy, sortOrder, page = 1, limit = 10 } = departmentFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);
    const where: Prisma.DepartmentWhereInput = {};

    if (search) {
      where.OR = buildSearchFilter(search, ["name", "description"]);
    }

    // Whitelist guards against Prisma validation errors (500) on arbitrary sortBy values
    const orderBy =
      sortBy && DEPARTMENT_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { name: "asc" as const };

    const [data, total] = await Promise.all([
      this.prisma.department.findMany({ where, skip, take, orderBy, include: DEPARTMENT_LIST_INCLUDE }),
      this.prisma.department.count({ where }),
    ]);

    const dataWithEmployeeCounts = await this.attachEmployeeCounts(data);

    return buildPaginatedResponse(dataWithEmployeeCounts, total, page, limit);
  }

  async findAllFlat(): Promise<DepartmentWithEmployeeCount[]> {
    // The hierarchy tree shows a headcount per node, so keep the include (raw
    // contract count) and let attachEmployeeCounts add the distinct-employee count.
    const departments = await this.prisma.department.findMany({
      orderBy: { name: "asc" },
      include: DEPARTMENT_TREE_INCLUDE,
    });
    return this.attachEmployeeCounts(departments);
  }

  async dropdown(): Promise<{ id: string; name: string; parentDepartmentId: string | null }[]> {
    return this.prisma.department.findMany({
      select: { id: true, name: true, parentDepartmentId: true },
      orderBy: { name: "asc" },
    });
  }

  async findById(departmentId: string): Promise<DepartmentDetail | null> {
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
      include: DEPARTMENT_DETAIL_INCLUDE,
    });

    if (!department) return null;

    const employeeCount = await this.getActiveEmployeeCount(departmentId);

    return { ...department, employeeCount };
  }

  async create(data: Prisma.DepartmentCreateInput): Promise<DepartmentDetail> {
    const department = await this.prisma.department.create({
      data,
      include: DEPARTMENT_DETAIL_INCLUDE,
    });

    // A department is empty the moment it's created — no contracts can reference it yet
    return { ...department, employeeCount: 0 };
  }

  async update(
    departmentId: string,
    data: Prisma.DepartmentUpdateInput,
  ): Promise<DepartmentDetail> {
    const department = await this.prisma.department.update({
      where: { id: departmentId },
      data,
      include: DEPARTMENT_DETAIL_INCLUDE,
    });

    const employeeCount = await this.getActiveEmployeeCount(departmentId);

    return { ...department, employeeCount };
  }

  async delete(departmentId: string): Promise<void> {
    await this.prisma.department.delete({ where: { id: departmentId } });
  }

  async hasEmployees(departmentId: string): Promise<boolean> {
    const count = await this.prisma.employeeContract.count({
      where: { departmentId, status: { in: ["ACTIVE", "DRAFT"] } },
    });
    return count > 0;
  }

  async hasChildren(departmentId: string): Promise<boolean> {
    const count = await this.prisma.department.count({
      where: { parentDepartmentId: departmentId },
    });
    return count > 0;
  }

  // Counts distinct employees with an ACTIVE contract, not raw contract rows —
  // an employee can hold several historical contracts but only one is ever ACTIVE.
  private async getActiveEmployeeCounts(departmentIds: string[]): Promise<Record<string, number>> {
    if (!departmentIds.length) return {};

    const activeContracts = await this.prisma.employeeContract.findMany({
      where: { departmentId: { in: departmentIds }, status: "ACTIVE" },
      select: { departmentId: true, employeeId: true },
    });

    const employeeIdsByDepartment = new Map<string, Set<string>>();
    for (const contract of activeContracts) {
      if (!contract.departmentId) continue;
      const employeeIds = employeeIdsByDepartment.get(contract.departmentId) ?? new Set<string>();
      employeeIds.add(contract.employeeId);
      employeeIdsByDepartment.set(contract.departmentId, employeeIds);
    }

    return Object.fromEntries(
      [...employeeIdsByDepartment.entries()].map(([departmentId, employeeIds]) => [
        departmentId,
        employeeIds.size,
      ]),
    );
  }

  private async getActiveEmployeeCount(departmentId: string): Promise<number> {
    const counts = await this.getActiveEmployeeCounts([departmentId]);
    return counts[departmentId] ?? 0;
  }

  private async attachEmployeeCounts(
    departments: Department[],
  ): Promise<DepartmentWithEmployeeCount[]> {
    const counts = await this.getActiveEmployeeCounts(
      departments.map((department) => department.id),
    );

    return departments.map((department) => ({
      ...department,
      employeeCount: counts[department.id] ?? 0,
    }));
  }
}
