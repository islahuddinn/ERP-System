import { Injectable } from "@nestjs/common";
import { Prisma, PrismaClient as TenantPrismaClient } from "@prisma/tenant-client";
import { WarehousesQueryDto } from "./dto/warehouse-query.dto";

@Injectable()
export class WarehousesRepository {
  async create(tenantClient: TenantPrismaClient, data: Prisma.WarehouseCreateInput) {
    return await tenantClient.warehouse.create({
      data,
      include: {
        location: {
          select: {
            id: true,
            name: true,
          },
        },
        // manager: true, // if relation exists
        zones: true,
      },
    });
  }

  async findAll(tenantClient: TenantPrismaClient, query: WarehousesQueryDto) {
    const { page = 1, limit = 20, search, locationId, status, warehouseType } = query;

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const where: Prisma.WarehouseWhereInput = {};

    if (locationId) where.locationId = locationId;
    if (status) where.status = status;
    if (warehouseType) where.warehouseType = warehouseType;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { contactPerson: { contains: search, mode: "insensitive" } },
      ];
    }

    const [data, total] = await tenantClient.$transaction([
      tenantClient.warehouse.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          location: {
            select: {
              id: true,
              name: true,
            },
          },
          zones: {
            select: {
              id: true,
              name: true,
              code: true,
              zoneType: true,
              // status: true,
            },
          },
          _count: {
            select: {
              zones: true,
              stockLedgers: true,
              capacityAlerts: true,
            },
          },
        },
      }),
      tenantClient.warehouse.count({ where }),
    ]);

    return { data, total, page, limit };
  }

  async findOne(tenantClient: TenantPrismaClient, where: Prisma.WarehouseWhereUniqueInput) {
    return tenantClient.warehouse.findUnique({
      where,
      include: {
        location: true,
        zones: {
          include: {
            stockBalances: true,
          },
        },
        stockBalances: true,
        capacityAlerts: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        _count: {
          select: {
            zones: true,
            stockLedgers: true,
            capacityAlerts: true,
          },
        },
      },
    });
  }

  async update(
    tenantClient: TenantPrismaClient,
    where: Prisma.WarehouseWhereUniqueInput,
    data: Prisma.WarehouseUpdateInput,
  ) {
    return tenantClient.warehouse.update({
      where,
      data,
      include: {
        location: true,
        zones: true,
      },
    });
  }

  async updateMany(
    tenantClient: TenantPrismaClient,
    where: Prisma.WarehouseWhereInput,
    data: Prisma.WarehouseUpdateManyMutationInput,
  ) {
    return tenantClient.warehouse.updateMany({
      where,
      data,
    });
  }

  async delete(tenantClient: TenantPrismaClient, where: Prisma.WarehouseWhereUniqueInput) {
    return tenantClient.warehouse.delete({
      where,
    });
  }

  async checkExistence(tenantClient: TenantPrismaClient, where: Prisma.WarehouseWhereUniqueInput) {
    return tenantClient.warehouse.findUnique({
      where,
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
      },
    });
  }

  async findByCode(tenantClient: TenantPrismaClient, code: string) {
    return tenantClient.warehouse.findUnique({
      where: { code },
      include: {
        zones: true,
      },
    });
  }
}
