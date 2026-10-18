import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { PrismaClient, WarehouseZone } from "@prisma/tenant-client";
import { CreateZoneDto } from "./dto/create-zone.dto";
import { UpdateZoneDto } from "./dto/update-zone.dto";

@Injectable()
export class ZonesService {
  private readonly logger = new Logger(ZonesService.name);

  private getPrisma(tenantClient?: PrismaClient): PrismaClient {
    if (!tenantClient) {
      throw new BadRequestException("Tenant context is required for zone operations");
    }
    return tenantClient;
  }

  /**
   * Create a new zone within a warehouse
   */
  async create(
    tenantClient: PrismaClient,
    warehouseId: string,
    dto: CreateZoneDto,
    userId: string,
  ): Promise<WarehouseZone> {
    const prisma = this.getPrisma(tenantClient);

    // Verify warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${warehouseId} not found`);
    }

    // Check if zone code already exists in this warehouse
    const existingZone = await prisma.warehouseZone.findUnique({
      where: {
        warehouseId_code: {
          warehouseId,
          code: dto.code,
        },
      },
    });

    if (existingZone) {
      throw new ConflictException(`Zone with code ${dto.code} already exists in this warehouse`);
    }

    // Calculate available capacity (initially equals total capacity since usedCapacity is 0)
    const availableCapacity = dto.totalCapacity;

    const zone = await prisma.warehouseZone.create({
      data: {
        warehouseId,
        name: dto.name,
        code: dto.code,
        zoneType: dto.zoneType,
        totalCapacity: dto.totalCapacity,
        usedCapacity: 0,
        availableCapacity,
        description: dto.description,
        temperature: dto.temperature,
        humidity: dto.humidity,
        notes: dto.notes,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            stockBalances: true,
          },
        },
      },
    });

    this.logger.log(`Zone created: ${zone.id} - ${zone.name} in warehouse ${warehouseId}`);
    return zone;
  }

  /**
   * Find all zones for a warehouse
   */
  async findAll(tenantClient: PrismaClient, warehouseId: string): Promise<WarehouseZone[]> {
    const prisma = this.getPrisma(tenantClient);

    // Verify warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${warehouseId} not found`);
    }

    return prisma.warehouseZone.findMany({
      where: { warehouseId },
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            stockBalances: true,
          },
        },
      },
    });
  }

  /**
   * Find one zone by ID
   */
  async findOne(tenantClient: PrismaClient, id: string): Promise<WarehouseZone> {
    const prisma = this.getPrisma(tenantClient);

    const zone = await prisma.warehouseZone.findUnique({
      where: { id },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
            warehouseType: true,
          },
        },
        _count: {
          select: {
            stockBalances: true,
          },
        },
      },
    });

    if (!zone) {
      throw new NotFoundException(`Zone with ID ${id} not found`);
    }

    return zone;
  }

  /**
   * Update zone
   */
  async update(tenantClient: PrismaClient, id: string, dto: UpdateZoneDto): Promise<WarehouseZone> {
    const prisma = this.getPrisma(tenantClient);

    const zone = await prisma.warehouseZone.findUnique({
      where: { id },
    });

    if (!zone) {
      throw new NotFoundException(`Zone with ID ${id} not found`);
    }

    // Check if code is being changed and if new code already exists in the warehouse
    if (dto.code && dto.code !== zone.code) {
      const codeExists = await prisma.warehouseZone.findUnique({
        where: {
          warehouseId_code: {
            warehouseId: zone.warehouseId,
            code: dto.code,
          },
        },
      });

      if (codeExists) {
        throw new ConflictException(`Zone with code ${dto.code} already exists in this warehouse`);
      }
    }

    // Calculate available capacity if totalCapacity is being updated
    const updateData: any = { ...dto };
    if (dto.totalCapacity !== undefined) {
      const usedCapacity = zone.usedCapacity;
      updateData.availableCapacity = dto.totalCapacity - usedCapacity;
    }

    return prisma.warehouseZone.update({
      where: { id },
      data: updateData,
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            stockBalances: true,
          },
        },
      },
    });
  }

  /**
   * Delete zone
   */
  async remove(tenantClient: PrismaClient, id: string): Promise<void> {
    const prisma = this.getPrisma(tenantClient);

    const zone = await prisma.warehouseZone.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            stockBalances: true,
          },
        },
      },
    });

    if (!zone) {
      throw new NotFoundException(`Zone with ID ${id} not found`);
    }

    // Check if zone has stock
    if (zone._count.stockBalances > 0) {
      throw new BadRequestException("Cannot delete zone with existing stock balances");
    }

    await prisma.warehouseZone.delete({
      where: { id },
    });

    this.logger.log(`Zone deleted: ${id}`);
  }

  /**
   * Get zone capacity information
   */
  async getZoneCapacity(tenantClient: PrismaClient, id: string) {
    const prisma = this.getPrisma(tenantClient);

    const zone = await prisma.warehouseZone.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        code: true,
        totalCapacity: true,
        usedCapacity: true,
        availableCapacity: true,
      },
    });

    if (!zone) {
      throw new NotFoundException(`Zone with ID ${id} not found`);
    }

    const capacityPercentage =
      zone.totalCapacity > 0 ? (zone.usedCapacity / zone.totalCapacity) * 100 : 0;

    return {
      ...zone,
      capacityPercentage: Math.round(capacityPercentage * 100) / 100,
    };
  }

  /**
   * Update zone capacity
   */
  async updateZoneCapacity(
    tenantClient: PrismaClient,
    id: string,
    usedCapacity: number,
  ): Promise<WarehouseZone> {
    const prisma = this.getPrisma(tenantClient);

    const zone = await prisma.warehouseZone.findUnique({
      where: { id },
    });

    if (!zone) {
      throw new NotFoundException(`Zone with ID ${id} not found`);
    }

    if (usedCapacity < 0) {
      throw new BadRequestException("Used capacity cannot be negative");
    }

    if (usedCapacity > zone.totalCapacity) {
      throw new BadRequestException("Used capacity cannot exceed total capacity");
    }

    const availableCapacity = zone.totalCapacity - usedCapacity;

    return prisma.warehouseZone.update({
      where: { id },
      data: {
        usedCapacity,
        availableCapacity,
      },
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
  }
}
