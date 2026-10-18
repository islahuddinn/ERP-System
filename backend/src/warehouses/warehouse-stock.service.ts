import { Injectable, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/tenant-client";
import { CapacityService } from "../common/services/capacity.service";

/**
 * Service to handle WarehouseStockBalance operations
 * Ensures availableQuantity is always calculated correctly
 */
@Injectable()
export class WarehouseStockService {
  private readonly logger = new Logger(WarehouseStockService.name);

  constructor(private readonly capacityService: CapacityService) {}

  /**
   * Create or update WarehouseStockBalance with automatic availableQuantity calculation
   */
  async upsertWarehouseStockBalance(
    tenantClient: PrismaClient,
    data: {
      warehouseId: string;
      zoneId?: string | null;
      productId: string;
      batchId?: string | null;
      quantity: number;
      reservedQuantity?: number;
    },
  ) {
    const reservedQty = data.reservedQuantity || 0;
    const availableQuantity = data.quantity - reservedQty;

    const stockBalance = await tenantClient.warehouseStockBalance.upsert({
      where: {
        warehouseId_zoneId_productId_batchId: {
          warehouseId: data.warehouseId,
          zoneId: data.zoneId || null,
          productId: data.productId,
          batchId: data.batchId || null,
        },
      },
      update: {
        quantity: data.quantity,
        reservedQuantity: reservedQty,
        availableQuantity: availableQuantity,
        lastUpdated: new Date(),
      },
      create: {
        warehouseId: data.warehouseId,
        zoneId: data.zoneId || null,
        productId: data.productId,
        batchId: data.batchId || null,
        quantity: data.quantity,
        reservedQuantity: reservedQty,
        availableQuantity: availableQuantity,
        lastUpdated: new Date(),
      },
    });

    // Automatically update warehouse capacity
    try {
      await this.capacityService.updateCapacity(tenantClient, data.warehouseId);
      await this.capacityService.checkCapacityAlerts(tenantClient, data.warehouseId);
    } catch (error) {
      this.logger.error(`Failed to update capacity for warehouse ${data.warehouseId}:`, error);
      // Don't throw - capacity update failure shouldn't fail stock balance update
    }

    return stockBalance;
  }

  /**
   * Update reserved quantity and recalculate availableQuantity
   */
  async updateReservedQuantity(
    tenantClient: PrismaClient,
    warehouseId: string,
    zoneId: string | null,
    productId: string,
    batchId: string | null,
    reservedQuantity: number,
  ) {
    const stockBalance = await tenantClient.warehouseStockBalance.findUnique({
      where: {
        warehouseId_zoneId_productId_batchId: {
          warehouseId,
          zoneId: zoneId || null,
          productId,
          batchId: batchId || null,
        },
      },
    });

    if (!stockBalance) {
      throw new Error("WarehouseStockBalance not found");
    }

    const availableQuantity = stockBalance.quantity - reservedQuantity;

    return tenantClient.warehouseStockBalance.update({
      where: {
        warehouseId_zoneId_productId_batchId: {
          warehouseId,
          zoneId: zoneId || null,
          productId,
          batchId: batchId || null,
        },
      },
      data: {
        reservedQuantity,
        availableQuantity: availableQuantity,
        lastUpdated: new Date(),
      },
    });
  }
}
