import { Injectable, Inject, NotFoundException } from "@nestjs/common";
import { PrismaClient, Prisma } from "@prisma/tenant-client";
import { StockLedgerService as CoreStockLedgerService } from "../common/services/stock-ledger.service";
import { FilterStockLedgerDto } from "./dto/filter-stock-ledger.dto";
import { createPaginatedResponse, getPaginationParams } from "../common/utils/pagination.helper";

@Injectable()
export class StockLedgerService {
  constructor(
    @Inject(CoreStockLedgerService)
    private readonly coreStockLedgerService: CoreStockLedgerService,
  ) {}

  /**
   * Record a stock movement (delegates to core service)
   */
  async recordMovement(
    tenantClient: PrismaClient,
    params: {
      productId: string;
      warehouseId?: string;
      zoneId?: string;
      batchId?: string;
      quantity: number;
      movementType: any;
      referenceType: string;
      referenceId: string;
      openingQty?: number;
      closingQty?: number;
      remarks?: string;
      userId: string;
      useFIFO?: boolean;
      allowExpired?: boolean;
      batchNumber?: string;
      expiryDate?: Date;
      manufacturingDate?: Date;
      receivedDate?: Date;
    },
  ) {
    return this.coreStockLedgerService.recordMovement(tenantClient, params);
  }

  /**
   * Get all stock ledger entries with filters
   */
  async findAll(tenantClient: PrismaClient, filterDto: FilterStockLedgerDto) {
    const { page = 1, limit = 10, ...filters } = filterDto;
    const pageNumber = Number(page) || 1;
    const limitNumber = Number(limit) || 10;
    const { skip, take } = getPaginationParams(pageNumber, limitNumber);

    const where: Prisma.StockLedgerWhereInput = {};

    if (filters.productId) {
      where.productId = filters.productId;
    }

    if (filters.warehouseId) {
      where.warehouseId = filters.warehouseId;
    }

    if (filters.zoneId) {
      where.zoneId = filters.zoneId;
    }

    if (filters.batchId) {
      where.batchId = filters.batchId;
    }

    if (filters.transactionType) {
      where.transactionType = filters.transactionType;
    }

    if (filters.referenceType) {
      where.referenceType = filters.referenceType;
    }

    if (filters.referenceId) {
      where.referenceId = filters.referenceId;
    }

    if (filters.createdById) {
      where.createdById = filters.createdById;
    }

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) {
        where.createdAt.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.createdAt.lte = new Date(filters.endDate);
      }
    }

    const [ledgerEntries, total] = await Promise.all([
      tenantClient.stockLedger.findMany({
        where,
        include: {
          product: {
            select: {
              id: true,
              name: true,
              code: true,
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
          rawMaterialBatch: {
            select: {
              id: true,
              batchNumber: true,
              expiryDate: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take,
      }),
      tenantClient.stockLedger.count({ where }),
    ]);

    return createPaginatedResponse(ledgerEntries, total, pageNumber, limitNumber);
  }

  /**
   * Get a stock ledger entry by ID
   */
  async findOne(tenantClient: PrismaClient, id: string) {
    const ledgerEntry = await tenantClient.stockLedger.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            code: true,
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
        rawMaterialBatch: {
          select: {
            id: true,
            batchNumber: true,
            expiryDate: true,
            status: true,
          },
        },
      },
    });

    if (!ledgerEntry) {
      throw new NotFoundException(`Stock ledger entry not found: ${id}`);
    }

    return ledgerEntry;
  }

  /**
   * Get current stock balance (delegates to core service)
   */
  async getCurrentBalance(
    tenantClient: PrismaClient,
    productId: string,
    warehouseId?: string,
    zoneId?: string,
  ): Promise<number> {
    return this.coreStockLedgerService.getCurrentBalance(
      tenantClient,
      productId,
      warehouseId,
      zoneId,
    );
  }

  /**
   * Check stock availability (delegates to core service)
   */
  async checkStockAvailability(
    tenantClient: PrismaClient,
    productId: string,
    requiredQuantity: number,
    warehouseId?: string,
    zoneId?: string,
    allowExpired = false,
  ): Promise<boolean> {
    return this.coreStockLedgerService.checkStockAvailability(
      tenantClient,
      productId,
      requiredQuantity,
      warehouseId,
      zoneId,
      allowExpired,
    );
  }
}
