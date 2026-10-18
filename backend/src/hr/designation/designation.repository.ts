import { Injectable } from "@nestjs/common";
import { Designation, Prisma } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import {
  buildOrderBy,
  buildSearchFilter,
  getPaginationParams,
} from "../../common/utils/pagination.helper";
import { DesignationFiltersDto } from "./dto/designation-filters.dto";
import {
  DESIGNATION_DETAIL_INCLUDE,
  DESIGNATION_LIST_INCLUDE,
  DESIGNATION_TREE_INCLUDE,
} from "./utils/constants";
import { DesignationDetail, DesignationWithEmployeeCount } from "./utils/types";

// Relation-backed sort keys use dot notation resolved by `buildOrderBy`:
//   "parent.title"      -> { parent: { title } }       (sort by parent designation title)
//   "contracts._count"  -> { contracts: { _count } }    (sort by employee/contract count)
const DESIGNATION_SORTABLE_FIELDS = [
  "title",
  "createdAt",
  "updatedAt",
  "parent.title",
  "contracts._count",
];

@Injectable()
export class DesignationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    designationFiltersDto: DesignationFiltersDto,
  ): Promise<PaginatedResponse<DesignationWithEmployeeCount>> {
    const { search, sortBy, sortOrder, page = 1, limit = 10 } = designationFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);
    const where: Prisma.DesignationWhereInput = {};

    if (search) {
      where.OR = buildSearchFilter(search, ["title", "description"]);
    }

    // Whitelist guards against Prisma validation errors (500) on arbitrary sortBy values
    const orderBy =
      sortBy && DESIGNATION_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { title: "asc" as const };

    const [data, total] = await Promise.all([
      this.prisma.designation.findMany({
        where,
        skip,
        take,
        orderBy,
        include: DESIGNATION_LIST_INCLUDE,
      }),
      this.prisma.designation.count({ where }),
    ]);

    const dataWithEmployeeCounts = await this.attachEmployeeCounts(data);

    return buildPaginatedResponse(dataWithEmployeeCounts, total, page, limit);
  }

  async findAllFlat(): Promise<DesignationWithEmployeeCount[]> {
    // The hierarchy tree shows a headcount per node, so keep the include (raw
    // contract count) and let attachEmployeeCounts add the distinct-employee count.
    const designations = await this.prisma.designation.findMany({
      orderBy: { title: "asc" },
      include: DESIGNATION_TREE_INCLUDE,
    });
    return this.attachEmployeeCounts(designations);
  }

  async dropdown(): Promise<{ id: string; title: string; parentDesignationId: string | null }[]> {
    return this.prisma.designation.findMany({
      select: { id: true, title: true, parentDesignationId: true },
      orderBy: { title: "asc" },
    });
  }

  async findById(designationId: string): Promise<DesignationDetail | null> {
    const designation = await this.prisma.designation.findUnique({
      where: { id: designationId },
      include: DESIGNATION_DETAIL_INCLUDE,
    });

    if (!designation) return null;

    const employeeCount = await this.getActiveEmployeeCount(designationId);

    return { ...designation, employeeCount };
  }

  async create(data: Prisma.DesignationCreateInput): Promise<DesignationDetail> {
    const designation = await this.prisma.designation.create({
      data,
      include: DESIGNATION_DETAIL_INCLUDE,
    });

    // A designation is empty the moment it's created — no contracts can reference it yet
    return { ...designation, employeeCount: 0 };
  }

  async update(
    designationId: string,
    data: Prisma.DesignationUpdateInput,
  ): Promise<DesignationDetail> {
    const designation = await this.prisma.designation.update({
      where: { id: designationId },
      data,
      include: DESIGNATION_DETAIL_INCLUDE,
    });

    const employeeCount = await this.getActiveEmployeeCount(designationId);

    return { ...designation, employeeCount };
  }

  async delete(designationId: string): Promise<void> {
    await this.prisma.designation.delete({ where: { id: designationId } });
  }

  async hasEmployees(designationId: string): Promise<boolean> {
    const count = await this.prisma.employeeContract.count({
      where: { designationId, status: { in: ["ACTIVE", "DRAFT"] } },
    });
    return count > 0;
  }

  async hasChildren(designationId: string): Promise<boolean> {
    const count = await this.prisma.designation.count({
      where: { parentDesignationId: designationId },
    });
    return count > 0;
  }

  // Counts distinct employees with an ACTIVE contract, not raw contract rows —
  // an employee can hold several historical contracts but only one is ever ACTIVE.
  private async getActiveEmployeeCounts(designationIds: string[]): Promise<Record<string, number>> {
    if (!designationIds.length) return {};

    const activeContracts = await this.prisma.employeeContract.findMany({
      where: { designationId: { in: designationIds }, status: "ACTIVE" },
      select: { designationId: true, employeeId: true },
    });

    const employeeIdsByDesignation = new Map<string, Set<string>>();
    for (const contract of activeContracts) {
      if (!contract.designationId) continue;
      const employeeIds = employeeIdsByDesignation.get(contract.designationId) ?? new Set<string>();
      employeeIds.add(contract.employeeId);
      employeeIdsByDesignation.set(contract.designationId, employeeIds);
    }

    return Object.fromEntries(
      [...employeeIdsByDesignation.entries()].map(([designationId, employeeIds]) => [
        designationId,
        employeeIds.size,
      ]),
    );
  }

  private async getActiveEmployeeCount(designationId: string): Promise<number> {
    const counts = await this.getActiveEmployeeCounts([designationId]);
    return counts[designationId] ?? 0;
  }

  private async attachEmployeeCounts(
    designations: Designation[],
  ): Promise<DesignationWithEmployeeCount[]> {
    const counts = await this.getActiveEmployeeCounts(
      designations.map((designation) => designation.id),
    );

    return designations.map((designation) => ({
      ...designation,
      employeeCount: counts[designation.id] ?? 0,
    }));
  }
}
