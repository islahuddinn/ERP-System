import { Injectable } from "@nestjs/common";
import { Prisma, Shift } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import {
  buildOrderBy,
  buildSearchFilter,
  getPaginationParams,
} from "../../common/utils/pagination.helper";
import { ShiftFiltersDto } from "./dto/shift-filters.dto";
import { SHIFT_DETAIL_INCLUDE } from "./utils/constants";
import { ShiftDetail } from "./utils/types";

const SHIFT_SORTABLE_FIELDS = [
  "name",
  "type",
  "startTime",
  "endTime",
  "graceMinutes",
  "createdAt",
  "updatedAt",
];

@Injectable()
export class ShiftRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(shiftFiltersDto: ShiftFiltersDto): Promise<PaginatedResponse<Shift>> {
    const { type, search, sortBy, sortOrder, page = 1, limit = 10 } = shiftFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);
    const where: Prisma.ShiftWhereInput = {};

    if (search) where.OR = buildSearchFilter(search, ["name"]);
    if (type) where.type = type;

    // Whitelist guards against Prisma validation errors (500) on arbitrary sortBy values
    const orderBy =
      sortBy && SHIFT_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { name: "asc" as const };

    const [data, total] = await Promise.all([
      this.prisma.shift.findMany({ where, skip, take, orderBy }),
      this.prisma.shift.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findById(shiftId: string): Promise<ShiftDetail | null> {
    return this.prisma.shift.findUnique({
      where: { id: shiftId },
      include: SHIFT_DETAIL_INCLUDE,
    });
  }

  async create(data: Prisma.ShiftCreateInput): Promise<ShiftDetail> {
    return this.prisma.shift.create({ data, include: SHIFT_DETAIL_INCLUDE });
  }

  async update(shiftId: string, data: Prisma.ShiftUpdateInput): Promise<ShiftDetail> {
    return this.prisma.shift.update({
      where: { id: shiftId },
      data,
      include: SHIFT_DETAIL_INCLUDE,
    });
  }

  async delete(shiftId: string): Promise<void> {
    await this.prisma.shift.delete({ where: { id: shiftId } });
  }

  async dropdown(): Promise<{ id: string; name: string; type: string }[]> {
    return this.prisma.shift.findMany({
      select: { id: true, name: true, type: true },
      orderBy: { name: "asc" },
    });
  }

  async hasEmployees(shiftId: string): Promise<boolean> {
    const count = await this.prisma.employee.count({ where: { shiftId } });
    return count > 0;
  }

  async hasAttendances(shiftId: string): Promise<boolean> {
    const count = await this.prisma.attendance.count({ where: { shiftId } });
    return count > 0;
  }
}
