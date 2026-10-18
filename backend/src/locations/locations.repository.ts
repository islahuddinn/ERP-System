import { BadRequestException, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/tenant-client";
import { TenantPrismaContextService } from "../prisma/tenant-prisma-context.service";
import { buildOrderBy, buildSearchFilter } from "src/common/utils/pagination.helper";
import { buildPaginatedResponse } from "src/common/dto/pagination.dto";
import { LocationsQueryDto } from "./dto/locations-query.dto";

const LOCATION_SELECT = {
  id: true,
  name: true,
  address: true,
  city: true,
  state: true,
  country: true,
  phone: true,
  email: true,
  lat: true,
  lng: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
} as const;

@Injectable()
export class LocationsRepository {
  constructor(private readonly tenantPrismaContext: TenantPrismaContextService) {}

  private get prisma() {
    const client = this.tenantPrismaContext.getTenantClient();
    if (!client) throw new BadRequestException("Tenant context is missing");
    return client;
  }

  async create(data: Prisma.LocationCreateInput) {
    return this.prisma.location.create({ data, select: LOCATION_SELECT });
  }

  async findAll(query: LocationsQueryDto) {
    const { search, country, city, page = 1, limit = 10, sortBy, sortOrder } = query;

    const where: Prisma.LocationWhereInput = {};

    if (country) where.country = { contains: country, mode: "insensitive" };
    if (city) where.city = { contains: city, mode: "insensitive" };
    if (search) {
      where.OR = buildSearchFilter(search, ["name", "address", "city", "state", "country"]);
    }

    const orderBy = buildOrderBy(sortBy, sortOrder);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.location.findMany({ where, select: LOCATION_SELECT, orderBy, skip, take: limit }),
      this.prisma.location.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findById(id: string) {
    return this.prisma.location.findUnique({ where: { id }, select: LOCATION_SELECT });
  }

  async findByName(name: string, excludeId?: string) {
    return this.prisma.location.findFirst({
      where: { name, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });
  }

  async checkExistence(id: string): Promise<boolean> {
    const hit = await this.prisma.location.findUnique({ where: { id }, select: { id: true } });
    return !!hit;
  }

  async update(id: string, data: Prisma.LocationUpdateInput) {
    return this.prisma.location.update({ where: { id }, data, select: LOCATION_SELECT });
  }

  async remove(id: string) {
    return this.prisma.location.delete({ where: { id } });
  }

  async bulkDelete(ids: string[]) {
    return this.prisma.location.deleteMany({ where: { id: { in: ids } } });
  }

  async hasStockBalances(id: string): Promise<boolean> {
    const count = await this.prisma.stockBalance.count({ where: { locationId: id } });
    return count > 0;
  }

  async dropdown() {
    return this.prisma.location.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, city: true, country: true },
    });
  }
}
