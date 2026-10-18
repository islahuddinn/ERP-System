import { Injectable } from "@nestjs/common";
import { Position, Prisma } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import {
  buildOrderBy,
  buildSearchFilter,
  getPaginationParams,
} from "../../common/utils/pagination.helper";
import { PositionFiltersDto } from "./dto/position-filters.dto";
import { POSITION_DETAIL_INCLUDE } from "./utils/constants";
import { PositionDetail, PositionWithEmployeeCount } from "./utils/types";

// "contracts._count" -> { contracts: { _count } } (sort by employee/contract count),
// resolved by buildOrderBy's dot-notation folding — same pattern as Department.
const POSITION_SORTABLE_FIELDS = [
  "title",
  "description",
  "createdAt",
  "updatedAt",
  "contracts._count",
];

@Injectable()
export class PositionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    positionFiltersDto: PositionFiltersDto,
  ): Promise<PaginatedResponse<PositionWithEmployeeCount>> {
    const { search, sortBy, sortOrder, page = 1, limit = 10 } = positionFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);
    const where: Prisma.PositionWhereInput = {};

    if (search) {
      where.OR = buildSearchFilter(search, ["title", "description"]);
    }

    // Whitelist guards against Prisma validation errors (500) on arbitrary sortBy values
    const orderBy =
      sortBy && POSITION_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { title: "asc" as const };

    const [data, total] = await Promise.all([
      // Include _count so the list shows the employee/contract count per position (#10).
      this.prisma.position.findMany({ where, skip, take, orderBy, include: POSITION_DETAIL_INCLUDE }),
      this.prisma.position.count({ where }),
    ]);

    const dataWithEmployeeCounts = await this.attachEmployeeCounts(data);

    return buildPaginatedResponse(dataWithEmployeeCounts, total, page, limit);
  }

  async dropdown(): Promise<{ id: string; title: string }[]> {
    return this.prisma.position.findMany({
      select: { id: true, title: true },
      orderBy: { title: "asc" },
    });
  }

  async findById(positionId: string): Promise<PositionDetail | null> {
    const position = await this.prisma.position.findUnique({
      where: { id: positionId },
      include: POSITION_DETAIL_INCLUDE,
    });

    if (!position) return null;

    const employeeCount = await this.getActiveEmployeeCount(positionId);

    return { ...position, employeeCount };
  }

  async create(data: Prisma.PositionCreateInput): Promise<PositionDetail> {
    const position = await this.prisma.position.create({ data, include: POSITION_DETAIL_INCLUDE });

    // A position is empty the moment it's created — no contracts can reference it yet
    return { ...position, employeeCount: 0 };
  }

  async update(positionId: string, data: Prisma.PositionUpdateInput): Promise<PositionDetail> {
    const position = await this.prisma.position.update({
      where: { id: positionId },
      data,
      include: POSITION_DETAIL_INCLUDE,
    });

    const employeeCount = await this.getActiveEmployeeCount(positionId);

    return { ...position, employeeCount };
  }

  async delete(positionId: string): Promise<void> {
    await this.prisma.position.delete({ where: { id: positionId } });
  }

  async hasEmployees(positionId: string): Promise<boolean> {
    const count = await this.prisma.employeeContract.count({
      where: { positionId, status: { in: ["ACTIVE", "DRAFT"] } },
    });
    return count > 0;
  }

  // Counts distinct employees with an ACTIVE contract, not raw contract rows —
  // an employee can hold several historical contracts but only one is ever ACTIVE.
  private async getActiveEmployeeCounts(positionIds: string[]): Promise<Record<string, number>> {
    if (!positionIds.length) return {};

    const activeContracts = await this.prisma.employeeContract.findMany({
      where: { positionId: { in: positionIds }, status: "ACTIVE" },
      select: { positionId: true, employeeId: true },
    });

    const employeeIdsByPosition = new Map<string, Set<string>>();
    for (const contract of activeContracts) {
      if (!contract.positionId) continue;
      const employeeIds = employeeIdsByPosition.get(contract.positionId) ?? new Set<string>();
      employeeIds.add(contract.employeeId);
      employeeIdsByPosition.set(contract.positionId, employeeIds);
    }

    return Object.fromEntries(
      [...employeeIdsByPosition.entries()].map(([positionId, employeeIds]) => [
        positionId,
        employeeIds.size,
      ]),
    );
  }

  private async getActiveEmployeeCount(positionId: string): Promise<number> {
    const counts = await this.getActiveEmployeeCounts([positionId]);
    return counts[positionId] ?? 0;
  }

  private async attachEmployeeCounts(positions: Position[]): Promise<PositionWithEmployeeCount[]> {
    const counts = await this.getActiveEmployeeCounts(positions.map((position) => position.id));

    return positions.map((position) => ({
      ...position,
      employeeCount: counts[position.id] ?? 0,
    }));
  }
}
