import { Injectable } from "@nestjs/common";
import { Holiday, Prisma } from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import { buildOrderBy, buildSearchFilter } from "../../common/utils/pagination.helper";
import { HolidayFiltersDto } from "./dto/holiday-filters.dto";

// Whitelist guards against Prisma validation errors (500) on arbitrary sortBy values.
const HOLIDAY_SORTABLE_FIELDS = [
  "name",
  "type",
  "startDate",
  "endDate",
  "description",
  "createdAt",
  "updatedAt",
];

@Injectable()
export class HolidayRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(holidayFiltersDto: HolidayFiltersDto): Promise<PaginatedResponse<Holiday>> {
    const { search, type, year, page = 1, limit = 10, sortBy, sortOrder } = holidayFiltersDto;
    const skip = (page - 1) * limit;
    const where: Prisma.HolidayWhereInput = {};

    if (search) where.OR = buildSearchFilter(search, ["name"]);
    if (type) where.type = type;
    if (year) {
      where.startDate = { gte: new Date(`${year}-01-01`), lte: new Date(`${year}-12-31`) };
    }

    const orderBy =
      sortBy && HOLIDAY_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : buildOrderBy("createdAt", sortOrder);

    const [data, total] = await Promise.all([
      this.prisma.holiday.findMany({ where, orderBy, skip, take: limit }),
      this.prisma.holiday.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findById(holidayId: string): Promise<Holiday | null> {
    return this.prisma.holiday.findUnique({ where: { id: holidayId } });
  }

  async findOverlapping(
    startDate: Date,
    endDate: Date,
    excludeHolidayId?: string,
  ): Promise<Holiday | null> {
    return this.prisma.holiday.findFirst({
      where: {
        ...(excludeHolidayId && { id: { not: excludeHolidayId } }),
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
  }

  async create(data: Prisma.HolidayCreateInput): Promise<Holiday> {
    return this.prisma.holiday.create({ data });
  }

  async update(holidayId: string, data: Prisma.HolidayUpdateInput): Promise<Holiday> {
    return this.prisma.holiday.update({ where: { id: holidayId }, data });
  }

  async delete(holidayId: string): Promise<void> {
    await this.prisma.holiday.delete({ where: { id: holidayId } });
  }

  async countInPeriod(periodStart: Date, periodEnd: Date): Promise<number> {
    return this.prisma.holiday.count({
      where: {
        startDate: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
    });
  }

  async findAllOverlapping(startDate: Date, endDate: Date): Promise<Holiday[]> {
    return this.prisma.holiday.findMany({
      where: {
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    });
  }
}
