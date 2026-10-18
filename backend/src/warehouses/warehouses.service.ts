import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { PrismaClient, Warehouse, WarehouseStatus, WarehouseType } from "@prisma/tenant-client";
import { CreateWarehouseDto } from "./dto/create-warehouse.dto";
import { UpdateWarehouseDto } from "./dto/update-warehouse.dto";
import { WarehouseFiltersDto } from "./dto/warehouse-filters.dto";
import { UpdateCapacityDto } from "./dto/update-capacity.dto";
import { AssignManagerDto } from "./dto/assign-manager.dto";
import { createPaginatedResponse, getPaginationParams } from "../common/utils/pagination.helper";
import { PaginatedResponse } from "../common/dto/pagination.dto";
import { StockLedgerService } from "../stock-ledger/stock-ledger.service";
import { StockLedgerService as CoreStockLedgerService } from "../common/services/stock-ledger.service";
import { FilterStockLedgerDto } from "../stock-ledger/dto/filter-stock-ledger.dto";
import { TransferStockDto } from "./dto/transfer-stock.dto";
import { StockTransactionType } from "@prisma/tenant-client";
import { CapacityService } from "../common/services/capacity.service";

@Injectable()
export class WarehousesService {
  private readonly logger = new Logger(WarehousesService.name);

  constructor(
    private readonly stockLedgerService: StockLedgerService,
    private readonly coreStockLedgerService: CoreStockLedgerService,
    private readonly capacityService: CapacityService,
  ) {}

  private getPrisma(tenantClient?: PrismaClient): PrismaClient {
    if (!tenantClient) {
      throw new BadRequestException("Tenant context is required for warehouse operations");
    }
    return tenantClient;
  }

  /**
   * Create a new warehouse
   */
  async create(
    tenantClient: PrismaClient,
    dto: CreateWarehouseDto,
    userId: string,
  ): Promise<Warehouse> {
    const prisma = this.getPrisma(tenantClient);

    // Check if code already exists
    const existingByCode = await prisma.warehouse.findUnique({
      where: { code: dto.code },
    });

    if (existingByCode) {
      throw new ConflictException(`Warehouse with code ${dto.code} already exists`);
    }

    // Verify location exists
    const location = await prisma.location.findUnique({
      where: { id: dto.locationId },
    });

    if (!location) {
      throw new NotFoundException(`Location with ID ${dto.locationId} not found`);
    }

    // Verify manager exists if provided
    if (dto.managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: dto.managerId },
      });

      if (!manager) {
        throw new NotFoundException(`User with ID ${dto.managerId} not found`);
      }
    }

    // Calculate available capacity (initially equals total capacity since usedCapacity is 0)
    const availableCapacity = dto.totalCapacity;

    const warehouse = await prisma.warehouse.create({
      data: {
        name: dto.name,
        code: dto.code,
        warehouseType: dto.warehouseType,
        locationId: dto.locationId,
        address: dto.address,
        contactPerson: dto.contactPerson,
        contactPhone: dto.contactPhone,
        contactEmail: dto.contactEmail,
        totalCapacity: dto.totalCapacity,
        usedCapacity: 0,
        availableCapacity,
        capacityUnit: dto.capacityUnit || "CUBIC_METER",
        status: WarehouseStatus.ACTIVE,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
        managerId: dto.managerId,
        description: dto.description,
        notes: dto.notes,
      },
      include: {
        location: true,
        _count: {
          select: {
            zones: true,
            stockBalances: true,
            capacityAlerts: true,
          },
        },
      },
    });

    this.logger.log(`Warehouse created: ${warehouse.id} - ${warehouse.name}`);
    return warehouse;
  }

  /**
   * Find all warehouses with pagination and filters
   */
  async findAll(
    tenantClient: PrismaClient,
    filters: WarehouseFiltersDto,
  ): Promise<PaginatedResponse<Warehouse>> {
    this.logger.debug(
      `[DEBUG] WarehousesService.findAll called with filters: ${JSON.stringify(filters)}`,
    );
    const prisma = this.getPrisma(tenantClient);
    const { page = 1, limit = 10 } = filters;
    const { skip, take } = getPaginationParams(page, limit);

    const where: any = {};

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { code: { contains: filters.search, mode: "insensitive" } },
        { address: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.warehouseType) {
      where.warehouseType = filters.warehouseType;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.locationId) {
      where.locationId = filters.locationId;
    }

    if (filters.managerId) {
      where.managerId = filters.managerId;
    }

    if (filters.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const [warehouses, total] = await Promise.all([
      prisma.warehouse.findMany({
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
          _count: {
            select: {
              zones: true,
              stockBalances: true,
              capacityAlerts: true,
            },
          },
        },
      }),
      prisma.warehouse.count({ where }),
    ]);

    const warehousesWithLiveCapacity = await Promise.all(
      warehouses.map(async (warehouse) => {
        try {
          // Sync database state for each warehouse in the list
          await this.capacityService.updateCapacity(prisma as any, warehouse.id);
          await this.capacityService.checkCapacityAlerts(prisma as any, warehouse.id);
        } catch (error) {
          this.logger.warn(
            `Failed to sync capacity for warehouse ${warehouse.id} in findAll: ${error.message}`,
          );
        }

        const usedCapacity = await this.capacityService.calculateUsedCapacity(
          prisma as any,
          warehouse.id,
        );
        const capacityPercentage =
          warehouse.totalCapacity > 0 ? (usedCapacity / warehouse.totalCapacity) * 100 : 0;

        return {
          ...warehouse,
          usedCapacity,
          availableCapacity: warehouse.totalCapacity - usedCapacity,
          capacityPercentage: Math.round(capacityPercentage * 100) / 100,
        };
      }),
    );

    return createPaginatedResponse(warehousesWithLiveCapacity, total, page, limit);
  }

  /**
   * Find one warehouse by ID
   */
  async findOne(tenantClient: PrismaClient, id: string): Promise<Warehouse> {
    const prisma = this.getPrisma(tenantClient);

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        location: true,
        zones: {
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
        _count: {
          select: {
            zones: true,
            stockBalances: true,
            capacityAlerts: true,
          },
        },
      },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    try {
      // Sync database state before returning
      await this.capacityService.updateCapacity(prisma as any, id);
      await this.capacityService.checkCapacityAlerts(prisma as any, id);
    } catch (error) {
      this.logger.warn(`Failed to sync capacity for warehouse ${id} in findOne: ${error.message}`);
    }

    const usedCapacity = await this.capacityService.calculateUsedCapacity(prisma as any, id);
    const capacityPercentage =
      warehouse.totalCapacity > 0 ? (usedCapacity / warehouse.totalCapacity) * 100 : 0;

    return {
      ...warehouse,
      usedCapacity,
      availableCapacity: warehouse.totalCapacity - usedCapacity,
      capacityPercentage: Math.round(capacityPercentage * 100) / 100,
    } as any;
  }

  /**
   * Update warehouse
   */
  async update(
    tenantClient: PrismaClient,
    id: string,
    dto: UpdateWarehouseDto,
    userId: string,
  ): Promise<Warehouse> {
    const prisma = this.getPrisma(tenantClient);

    // Check if warehouse exists
    const existing = await prisma.warehouse.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    // Check if code is being changed and if new code already exists
    if (dto.code && dto.code !== existing.code) {
      const codeExists = await prisma.warehouse.findUnique({
        where: { code: dto.code },
      });

      if (codeExists) {
        throw new ConflictException(`Warehouse with code ${dto.code} already exists`);
      }
    }

    // Verify location exists if being updated
    if (dto.locationId && dto.locationId !== existing.locationId) {
      const location = await prisma.location.findUnique({
        where: { id: dto.locationId },
      });

      if (!location) {
        throw new NotFoundException(`Location with ID ${dto.locationId} not found`);
      }
    }

    // Verify manager exists if being updated
    if (dto.managerId !== undefined) {
      if (dto.managerId) {
        const manager = await prisma.user.findUnique({
          where: { id: dto.managerId },
        });

        if (!manager) {
          throw new NotFoundException(`User with ID ${dto.managerId} not found`);
        }
      }
    }

    // Calculate available capacity if totalCapacity is being updated
    const updateData: any = { ...dto };
    if (dto.totalCapacity !== undefined) {
      const usedCapacity = existing.usedCapacity;
      updateData.availableCapacity = dto.totalCapacity - usedCapacity;
    }

    const warehouse = await prisma.warehouse.update({
      where: { id },
      data: updateData,
      include: {
        location: true,
        _count: {
          select: {
            zones: true,
            stockBalances: true,
            capacityAlerts: true,
          },
        },
      },
    });

    this.logger.log(`Warehouse updated: ${warehouse.id} - ${warehouse.name}`);
    return warehouse;
  }

  /**
   * Delete warehouse (soft delete by setting isActive to false)
   */
  async remove(tenantClient: PrismaClient, id: string): Promise<void> {
    const prisma = this.getPrisma(tenantClient);

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            stockBalances: true,
            zones: true,
          },
        },
      },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    // Check if warehouse has stock or zones
    if (warehouse._count.stockBalances > 0) {
      throw new BadRequestException("Cannot delete warehouse with existing stock balances");
    }

    if (warehouse._count.zones > 0) {
      throw new BadRequestException(
        "Cannot delete warehouse with existing zones. Please delete zones first.",
      );
    }

    // Soft delete by setting isActive to false
    await prisma.warehouse.update({
      where: { id },
      data: { isActive: false, status: WarehouseStatus.INACTIVE },
    });

    this.logger.log(`Warehouse deleted (soft): ${id}`);
  }

  /**
   * Update warehouse capacity
   */
  async updateCapacity(
    tenantClient: PrismaClient,
    id: string,
    dto: UpdateCapacityDto,
  ): Promise<Warehouse> {
    const prisma = this.getPrisma(tenantClient);

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    const usedCapacity =
      dto.usedCapacity !== undefined
        ? dto.usedCapacity
        : await this.capacityService.calculateUsedCapacity(prisma as any, id);

    const totalCapacity =
      dto.totalCapacity !== undefined ? dto.totalCapacity : warehouse.totalCapacity;

    const updateData: any = {
      usedCapacity,
      totalCapacity,
      availableCapacity: totalCapacity - usedCapacity,
    };

    if (dto.capacityUnit) {
      updateData.capacityUnit = dto.capacityUnit;
    }

    return prisma.warehouse.update({
      where: { id },
      data: updateData,
      include: {
        location: true,
      },
    });
  }

  /**
   * Get capacity information for a warehouse
   */
  async getCapacityInfo(tenantClient: PrismaClient, id: string) {
    const prisma = this.getPrisma(tenantClient);

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    const usedCapacity = await this.capacityService.calculateUsedCapacity(prisma as any, id);
    const availableCapacity = warehouse.totalCapacity - usedCapacity;
    const capacityPercentage =
      warehouse.totalCapacity > 0 ? (usedCapacity / warehouse.totalCapacity) * 100 : 0;

    return {
      id: warehouse.id,
      name: warehouse.name,
      code: warehouse.code,
      totalCapacity: warehouse.totalCapacity,
      usedCapacity,
      availableCapacity,
      capacityUnit: warehouse.capacityUnit,
      capacityPercentage: Math.round(capacityPercentage * 100) / 100,
    };
  }

  /**
   * Check capacity alerts for a warehouse
   */
  async checkCapacityAlerts(tenantClient: PrismaClient, id: string) {
    const prisma = this.getPrisma(tenantClient);

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    const alerts = await prisma.warehouseCapacityAlert.findMany({
      where: {
        warehouseId: id,
        isResolved: false,
      },
      orderBy: { createdAt: "desc" },
      include: {
        zone: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    return alerts;
  }

  /**
   * Calculate available capacity
   */
  async calculateAvailableCapacity(tenantClient: PrismaClient, id: string): Promise<number> {
    const prisma = this.getPrisma(tenantClient);

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      select: {
        totalCapacity: true,
        usedCapacity: true,
      },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    return warehouse.totalCapacity - warehouse.usedCapacity;
  }

  /**
   * Assign manager to warehouse
   */
  async assignManager(
    tenantClient: PrismaClient,
    id: string,
    managerId: string,
  ): Promise<Warehouse> {
    const prisma = this.getPrisma(tenantClient);

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    const manager = await prisma.user.findUnique({
      where: { id: managerId },
    });

    if (!manager) {
      throw new NotFoundException(`User with ID ${managerId} not found`);
    }

    return prisma.warehouse.update({
      where: { id },
      data: { managerId },
      include: {
        location: true,
      },
    });
  }

  /**
   * Remove manager from warehouse
   */
  async removeManager(tenantClient: PrismaClient, id: string): Promise<Warehouse> {
    const prisma = this.getPrisma(tenantClient);

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    return prisma.warehouse.update({
      where: { id },
      data: { managerId: null },
      include: {
        location: true,
      },
    });
  }

  /**
   * Update warehouse status
   */
  async updateStatus(
    tenantClient: PrismaClient,
    id: string,
    status: WarehouseStatus,
  ): Promise<Warehouse> {
    const prisma = this.getPrisma(tenantClient);

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    return prisma.warehouse.update({
      where: { id },
      data: { status },
      include: {
        location: true,
      },
    });
  }

  /**
   * Get warehouse statistics
   */
  async getWarehouseStats(tenantClient: PrismaClient, id: string) {
    const prisma = this.getPrisma(tenantClient);

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            zones: true,
            stockBalances: true,
            capacityAlerts: true,
          },
        },
      },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    // Get active alerts count
    const activeAlertsCount = await prisma.warehouseCapacityAlert.count({
      where: {
        warehouseId: id,
        isResolved: false,
      },
    });

    try {
      // Sync database state before returning stats
      await this.capacityService.updateCapacity(prisma as any, id);
      await this.capacityService.checkCapacityAlerts(prisma as any, id);
    } catch (error) {
      this.logger.warn(
        `Failed to sync capacity for warehouse ${id} in getWarehouseStats: ${error.message}`,
      );
    }

    // Calculate live capacity
    const usedCapacity = await this.capacityService.calculateUsedCapacity(prisma as any, id);
    const capacityPercentage =
      warehouse.totalCapacity > 0 ? (usedCapacity / warehouse.totalCapacity) * 100 : 0;

    return {
      warehouse: {
        id: warehouse.id,
        name: warehouse.name,
        code: warehouse.code,
        status: warehouse.status,
        isActive: warehouse.isActive,
      },
      capacity: {
        total: warehouse.totalCapacity,
        used: usedCapacity,
        available: warehouse.totalCapacity - usedCapacity,
        percentage: Math.round(capacityPercentage * 100) / 100,
        unit: warehouse.capacityUnit,
      },
      counts: {
        zones: warehouse._count.zones,
        stockBalances: warehouse._count.stockBalances,
        totalAlerts: warehouse._count.capacityAlerts,
        activeAlerts: activeAlertsCount,
      },
    };
  }

  /**
   * Get stock summary for warehouse
   */
  async getStockSummary(tenantClient: PrismaClient, id: string) {
    const prisma = this.getPrisma(tenantClient);

    const warehouse = await prisma.warehouse.findUnique({
      where: { id },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${id} not found`);
    }

    const stockBalances = await prisma.warehouseStockBalance.findMany({
      where: { warehouseId: id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        zone: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: { lastUpdated: "desc" },
    });

    const totalProducts = stockBalances.length;
    const totalQuantity = stockBalances.reduce((sum, balance) => sum + balance.quantity, 0);
    const totalReserved = stockBalances.reduce((sum, balance) => sum + balance.reservedQuantity, 0);
    const totalAvailable = stockBalances.reduce(
      (sum, balance) => sum + balance.availableQuantity,
      0,
    );

    return {
      warehouse: {
        id: warehouse.id,
        name: warehouse.name,
        code: warehouse.code,
      },
      summary: {
        totalProducts,
        totalQuantity,
        totalReserved,
        totalAvailable,
      },
      stockBalances,
    };
  }

  /**
   * Get global stock summary across all warehouses
   * Used by Warehouse Stock Overview page
   */
  async getGlobalStockSummary(tenantClient: PrismaClient) {
    const prisma = this.getPrisma(tenantClient);

    const balances = await prisma.warehouseStockBalance.findMany({
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
            sellingPrice: true,
            reorderLevel: true,
            minStock: true,
          },
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
        zone: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!balances.length) {
      return {
        totalProducts: 0,
        totalQuantity: 0,
        totalValue: 0,
        totalReserved: 0,
        totalAvailable: 0,
        lowStockItems: 0,
        warehouses: [],
        zones: [],
      };
    }

    const uniqueProducts = new Set<string>();
    let totalQuantity = 0;
    let totalValue = 0;
    let totalReserved = 0;
    let totalAvailable = 0;

    const warehouseMap = new Map<
      string,
      {
        warehouseId: string;
        warehouseName: string;
        productCount: number;
        totalQuantity: number;
        totalValue: number;
      }
    >();

    const zoneMap = new Map<
      string,
      {
        zoneId: string | null;
        zoneName: string;
        warehouseName: string;
        productCount: number;
        totalQuantity: number;
        totalValue: number;
      }
    >();

    const lowStockProductIds = new Set<string>();

    balances.forEach((balance) => {
      const product = balance.product;
      if (!product) {
        return;
      }

      uniqueProducts.add(product.id);

      const qty = balance.quantity || 0;
      const reserved = balance.reservedQuantity || 0;
      const available = balance.availableQuantity || 0;

      totalQuantity += qty;
      totalReserved += reserved;
      totalAvailable += available;

      const priceNumber =
        (product.sellingPrice ? Number(product.sellingPrice) : undefined) ??
        (product.sellingPrice ? Number(product.sellingPrice) : 0);
      totalValue += qty * priceNumber;

      // Warehouse-level aggregation
      if (balance.warehouse) {
        const wKey = balance.warehouse.id;
        const existingW = warehouseMap.get(wKey) || {
          warehouseId: balance.warehouse.id,
          warehouseName: balance.warehouse.name,
          productCount: 0,
          totalQuantity: 0,
          totalValue: 0,
        };

        existingW.productCount += 1;
        existingW.totalQuantity += qty;
        existingW.totalValue += qty * priceNumber;

        warehouseMap.set(wKey, existingW);
      }

      // Zone-level aggregation
      if (balance.zone && balance.warehouse) {
        const zKey = `${balance.zone.id}-${balance.warehouse.id}`;
        const existingZ = zoneMap.get(zKey) || {
          zoneId: balance.zone.id,
          zoneName: balance.zone.name,
          warehouseName: balance.warehouse.name,
          productCount: 0,
          totalQuantity: 0,
          totalValue: 0,
        };

        existingZ.productCount += 1;
        existingZ.totalQuantity += qty;
        existingZ.totalValue += qty * priceNumber;

        zoneMap.set(zKey, existingZ);
      }

      // Low stock: quantity <= reorderLevel/minStock and > 0
      const reorderLevel = (product.reorderLevel ?? 0) || (product.minStock ?? 0);
      if (qty > 0 && reorderLevel > 0 && qty <= reorderLevel) {
        lowStockProductIds.add(product.id);
      }
    });

    return {
      totalProducts: uniqueProducts.size,
      totalQuantity,
      totalValue,
      totalReserved,
      totalAvailable,
      lowStockItems: lowStockProductIds.size,
      warehouses: Array.from(warehouseMap.values()),
      zones: Array.from(zoneMap.values()),
    };
  }

  /**
   * Get paginated warehouse stock balances (for Stock by Warehouse page)
   */
  async getWarehouseStockBalances(
    tenantClient: PrismaClient,
    filters?: {
      warehouseId?: string;
      zoneId?: string;
      productId?: string;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const prisma = this.getPrisma(tenantClient);

    const page = filters?.page && filters.page > 0 ? filters.page : 1;
    const limit = filters?.limit && filters.limit > 0 ? filters.limit : 50;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters?.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }
    if (filters?.zoneId) {
      where.zoneId = filters.zoneId;
    }
    if (filters?.productId) {
      where.productId = filters.productId;
    }

    const search = filters?.search?.trim();
    if (search) {
      where.OR = [
        {
          product: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          product: {
            sku: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          warehouse: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
        {
          zone: {
            name: {
              contains: search,
              mode: "insensitive",
            },
          },
        },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.warehouseStockBalance.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              code: true,
              sellingPrice: true,
            },
          },
          warehouse: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          zone: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
        orderBy: { lastUpdated: "desc" },
        skip,
        take: limit,
      }),
      prisma.warehouseStockBalance.count({ where }),
    ]);

    return {
      data: items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get stock transactions for warehouses
   */
  async getStockTransactions(
    tenantClient: PrismaClient,
    filters?: {
      warehouseId?: string;
      zoneId?: string;
      productId?: string;
      transactionType?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    },
  ) {
    const filterDto: FilterStockLedgerDto = {
      warehouseId: filters?.warehouseId,
      zoneId: filters?.zoneId,
      productId: filters?.productId,
      transactionType: filters?.transactionType as any,
      startDate: filters?.startDate,
      endDate: filters?.endDate,
      page: filters?.page || 1,
      limit: filters?.limit || 50,
    };

    this.logger.log(`Getting stock transactions with filters: ${JSON.stringify(filterDto)}`);

    const result = await this.stockLedgerService.findAll(tenantClient, filterDto);

    this.logger.log(
      `Stock transactions result: total=${result.meta?.total || 0}, data.length=${result.data?.length || 0}`,
    );

    return result;
  }

  /**
   * Transfer stock between warehouses/zones
   * Uses StockLedgerService to ensure FIFO and batch preservation
   */
  async transferStock(tenantClient: PrismaClient, dto: TransferStockDto, userId: string) {
    const prisma = this.getPrisma(tenantClient);

    // Validate source and destination are different
    if (dto.fromWarehouseId === dto.toWarehouseId && dto.fromZoneId === dto.toZoneId) {
      throw new BadRequestException("Source and destination must be different");
    }

    // Validate source warehouse exists
    const fromWarehouse = await prisma.warehouse.findUnique({
      where: { id: dto.fromWarehouseId },
    });
    if (!fromWarehouse) {
      throw new NotFoundException(`Source warehouse not found: ${dto.fromWarehouseId}`);
    }

    // Validate destination warehouse exists
    const toWarehouse = await prisma.warehouse.findUnique({
      where: { id: dto.toWarehouseId },
    });
    if (!toWarehouse) {
      throw new NotFoundException(`Destination warehouse not found: ${dto.toWarehouseId}`);
    }

    // Validate zones if provided
    if (dto.fromZoneId) {
      const fromZone = await prisma.warehouseZone.findUnique({
        where: { id: dto.fromZoneId },
      });
      if (!fromZone || fromZone.warehouseId !== dto.fromWarehouseId) {
        throw new NotFoundException(
          `Source zone not found or does not belong to source warehouse: ${dto.fromZoneId}`,
        );
      }
    }

    if (dto.toZoneId) {
      const toZone = await prisma.warehouseZone.findUnique({
        where: { id: dto.toZoneId },
      });
      if (!toZone || toZone.warehouseId !== dto.toWarehouseId) {
        throw new NotFoundException(
          `Destination zone not found or does not belong to destination warehouse: ${dto.toZoneId}`,
        );
      }
    }

    // Generate unique transfer reference ID
    const transferReferenceId = `STOCK-TRANSFER-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Perform transfer in a single transaction
    return prisma.$transaction(async (tx) => {
      // Step 1: Deduct from source using FIFO
      const sourceMovement = await this.coreStockLedgerService.recordMovement(
        tenantClient,
        {
          productId: dto.productId,
          warehouseId: dto.fromWarehouseId,
          zoneId: dto.fromZoneId,
          batchId: dto.batchId, // If specific batch requested
          quantity: -dto.quantity, // Negative for decrease
          movementType: StockTransactionType.TRANSFER_OUT,
          referenceType: "STOCK_TRANSFER",
          referenceId: transferReferenceId,
          remarks: dto.notes || `Stock transfer from ${fromWarehouse.name} to ${toWarehouse.name}`,
          userId,
          useFIFO: true, // Use FIFO for deduction
          allowExpired: false, // Don't allow expired batches
        },
        tx,
      );

      // Step 2: Get batch information from source deduction to preserve it
      let preservedBatchId: string | undefined = dto.batchId;
      let preservedBatchNumber: string | undefined;
      let preservedExpiryDate: Date | undefined;
      let preservedManufacturingDate: Date | undefined;

      // Extract batch info from the ledger entry returned
      if (sourceMovement && (sourceMovement as any).batchId) {
        const batchId = (sourceMovement as any).batchId;
        const batch = await tx.rawMaterialBatch.findUnique({
          where: { id: batchId },
          select: {
            id: true,
            batchNumber: true,
            expiryDate: true,
            manufacturingDate: true,
          },
        });

        if (batch) {
          preservedBatchId = batch.id;
          preservedBatchNumber = batch.batchNumber;
          preservedExpiryDate = batch.expiryDate || undefined;
          preservedManufacturingDate = batch.manufacturingDate || undefined;
        }
      }

      // Step 3: Add to destination with preserved batch information
      const destinationMovement = await this.coreStockLedgerService.recordMovement(
        tenantClient,
        {
          productId: dto.productId,
          warehouseId: dto.toWarehouseId,
          zoneId: dto.toZoneId,
          batchId: preservedBatchId, // Preserve batch from source
          quantity: dto.quantity, // Positive for increase
          movementType: StockTransactionType.TRANSFER_IN,
          referenceType: "STOCK_TRANSFER",
          referenceId: transferReferenceId,
          remarks: dto.notes || `Stock transfer from ${fromWarehouse.name} to ${toWarehouse.name}`,
          userId,
          batchNumber: preservedBatchNumber,
          expiryDate: preservedExpiryDate,
          manufacturingDate: preservedManufacturingDate,
        },
        tx,
      );

      this.logger.log(
        `Stock transfer completed: ${dto.quantity} units of product ${dto.productId} from warehouse ${dto.fromWarehouseId} to ${dto.toWarehouseId}`,
      );

      return {
        success: true,
        transferReferenceId,
        sourceMovement,
        destinationMovement,
      };
    });
  }
}
