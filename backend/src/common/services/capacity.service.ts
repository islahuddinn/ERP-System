import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { PrismaClient, CapacityAlertLevel } from "@prisma/tenant-client";

@Injectable()
export class CapacityService {
  private readonly logger = new Logger(CapacityService.name);

  /**
   * Calculate used capacity from WarehouseStockBalance including product volumes
   */
  async calculateUsedCapacity(
    tenantClient: PrismaClient | any,
    warehouseId: string,
  ): Promise<number> {
    const balances = await tenantClient.warehouseStockBalance.findMany({
      where: {
        warehouseId,
        batchId: null, // Only sum aggregate balances to avoid double counting
      },
    });

    const totalUsed = balances.reduce((sum: number, b: { quantity: any }) => {
      return sum + Number(b.quantity);
    }, 0);

    const result = Math.max(0, totalUsed);
    this.logger.debug(
      `[CAPACITY] calculateUsedCapacity for ${warehouseId}: ${result} (Raw: ${totalUsed})`,
    );
    return result;
  }

  /**
   * Calculate available capacity for a warehouse
   */
  async calculateAvailableCapacity(
    tenantClient: PrismaClient | any,
    warehouseId: string,
  ): Promise<number> {
    const warehouse = await tenantClient.warehouse.findUnique({
      where: { id: warehouseId },
      select: { totalCapacity: true },
    });
    if (!warehouse) return 0;
    const used = await this.calculateUsedCapacity(tenantClient, warehouseId);
    return Math.max(0, Number(warehouse.totalCapacity) - used);
  }

  /**
   * Adjust warehouse capacity by a delta volume (Event-Driven O(1))
   * Formula: used_capacity += deltaVolume
   */
  async adjustCapacity(prisma: any, warehouseId: string, deltaVolume: number): Promise<void> {
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { id: true, totalCapacity: true, usedCapacity: true },
    });

    if (!warehouse) return;

    const newUsedCapacity = Math.max(0, Number(warehouse.usedCapacity) + deltaVolume);

    // Enforce capacity limits (Safety Guarantee)
    if (deltaVolume > 0 && newUsedCapacity > Number(warehouse.totalCapacity)) {
      throw new Error(
        `CAPACITY_EXCEEDED: Warehouse ${warehouseId} cannot accommodate ${deltaVolume.toFixed(2)} more volume units.`,
      );
    }

    const newAvailableCapacity = Math.max(0, Number(warehouse.totalCapacity) - newUsedCapacity);

    // Atomic update within the provided transaction/client
    await prisma.warehouse.update({
      where: { id: warehouseId },
      data: {
        usedCapacity: newUsedCapacity,
        availableCapacity: newAvailableCapacity,
      },
    });

    this.logger.log(
      `[CAPACITY-EVENT] Adjusted warehouse ${warehouseId}: Delta=${deltaVolume.toFixed(2)}, NewUsed=${newUsedCapacity.toFixed(2)}`,
    );
  }

  /**
   * Synchronize warehouse capacity (Total Recount)
   */
  async updateCapacity(tenantClient: PrismaClient | any, warehouseId: string): Promise<void> {
    const warehouse = await tenantClient.warehouse.findUnique({
      where: { id: warehouseId },
    });

    if (!warehouse) return;

    const usedCapacity = await this.calculateUsedCapacity(tenantClient, warehouseId);
    const totalCapacity = warehouse.totalCapacity ?? 0;
    const availableCapacity = Math.max(0, totalCapacity - usedCapacity);

    await tenantClient.warehouse.update({
      where: { id: warehouseId },
      data: {
        usedCapacity,
        availableCapacity,
      },
    });

    this.logger.log(
      `[CAPACITY-SYNC] Synced warehouse ${warehouseId}: ${usedCapacity}/${totalCapacity}`,
    );
  }

  /**
   * Check capacity and generate alerts if thresholds are exceeded
   */
  async checkCapacityAlerts(tenantClient: PrismaClient, warehouseId: string): Promise<void> {
    const warehouse = await tenantClient.warehouse.findUnique({
      where: { id: warehouseId },
    });

    if (!warehouse) {
      throw new NotFoundException(`Warehouse with ID ${warehouseId} not found`);
    }

    if (warehouse.totalCapacity === 0) {
      return; // Skip if no capacity defined
    }

    const percentageUsed = (warehouse.usedCapacity / warehouse.totalCapacity) * 100;
    let alertLevel: CapacityAlertLevel | null = null;
    let threshold = 0;

    // Determine alert level based on thresholds
    if (percentageUsed >= 95) {
      alertLevel = CapacityAlertLevel.FULL;
      threshold = 95;
    } else if (percentageUsed >= 85) {
      alertLevel = CapacityAlertLevel.CRITICAL;
      threshold = 85;
    } else if (percentageUsed >= 70) {
      alertLevel = CapacityAlertLevel.WARNING;
      threshold = 70;
    }

    // Check if there's already an unresolved alert for this level
    if (alertLevel) {
      const existingAlert = await tenantClient.warehouseCapacityAlert.findFirst({
        where: {
          warehouseId,
          alertLevel,
          isResolved: false,
        },
      });

      // Create new alert if one doesn't exist
      if (!existingAlert) {
        await tenantClient.warehouseCapacityAlert.create({
          data: {
            warehouseId,
            alertLevel,
            currentCapacity: percentageUsed,
            currentUsed: warehouse.usedCapacity,
            currentAvailable: warehouse.availableCapacity,
            threshold,
            message: `Warehouse capacity is at ${percentageUsed.toFixed(2)}% (${alertLevel} threshold: ${threshold}%)`,
          },
        });

        this.logger.warn(
          `Capacity alert created for warehouse ${warehouseId}: ${alertLevel} at ${percentageUsed.toFixed(2)}%`,
        );
      }
    }

    // Resolve alerts if capacity drops below thresholds
    if (percentageUsed < 70) {
      await tenantClient.warehouseCapacityAlert.updateMany({
        where: {
          warehouseId,
          isResolved: false,
          alertLevel: {
            in: [CapacityAlertLevel.WARNING, CapacityAlertLevel.CRITICAL, CapacityAlertLevel.FULL],
          },
        },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
        },
      });
    } else if (percentageUsed < 85) {
      // Resolve CRITICAL and FULL alerts if below 85%
      await tenantClient.warehouseCapacityAlert.updateMany({
        where: {
          warehouseId,
          isResolved: false,
          alertLevel: {
            in: [CapacityAlertLevel.CRITICAL, CapacityAlertLevel.FULL],
          },
        },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
        },
      });
    } else if (percentageUsed < 95) {
      // Resolve FULL alerts if below 95%
      await tenantClient.warehouseCapacityAlert.updateMany({
        where: {
          warehouseId,
          isResolved: false,
          alertLevel: CapacityAlertLevel.FULL,
        },
        data: {
          isResolved: true,
          resolvedAt: new Date(),
        },
      });
    }
  }

  /**
   * Check capacity alerts for a specific zone
   */
  async checkZoneCapacityAlerts(tenantClient: PrismaClient, zoneId: string): Promise<void> {
    const zone = await tenantClient.warehouseZone.findUnique({
      where: { id: zoneId },
      include: {
        warehouse: true,
      },
    });

    if (!zone) {
      throw new NotFoundException(`Zone with ID ${zoneId} not found`);
    }

    if (zone.totalCapacity === 0) {
      return;
    }

    const percentageUsed = (zone.usedCapacity / zone.totalCapacity) * 100;
    let alertLevel: CapacityAlertLevel | null = null;
    let threshold = 0;

    if (percentageUsed >= 95) {
      alertLevel = CapacityAlertLevel.FULL;
      threshold = 95;
    } else if (percentageUsed >= 85) {
      alertLevel = CapacityAlertLevel.CRITICAL;
      threshold = 85;
    } else if (percentageUsed >= 70) {
      alertLevel = CapacityAlertLevel.WARNING;
      threshold = 70;
    }

    if (alertLevel) {
      const existingAlert = await tenantClient.warehouseCapacityAlert.findFirst({
        where: {
          warehouseId: zone.warehouseId,
          zoneId,
          alertLevel,
          isResolved: false,
        },
      });

      if (!existingAlert) {
        await tenantClient.warehouseCapacityAlert.create({
          data: {
            warehouseId: zone.warehouseId,
            zoneId,
            alertLevel,
            currentCapacity: percentageUsed,
            currentUsed: zone.usedCapacity,
            currentAvailable: zone.availableCapacity,
            threshold,
            message: `Zone ${zone.name} capacity is at ${percentageUsed.toFixed(2)}% (${alertLevel} threshold: ${threshold}%)`,
          },
        });
      }
    }
  }

  /**
   * Update capacity for all warehouses (for background job)
   */
  async updateAllWarehouseCapacities(tenantClient: PrismaClient): Promise<void> {
    const warehouses = await tenantClient.warehouse.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    for (const warehouse of warehouses) {
      try {
        await this.updateCapacity(tenantClient, warehouse.id);
        await this.checkCapacityAlerts(tenantClient, warehouse.id);
      } catch (error) {
        this.logger.error(`Failed to update capacity for warehouse ${warehouse.id}:`, error);
      }
    }

    this.logger.log(`Updated capacity for ${warehouses.length} warehouses`);
  }

  /**
   * Manually resolve an alert
   */
  async resolveAlert(
    tenantClient: PrismaClient,
    alertId: string,
    userId: string,
    reason?: string,
  ): Promise<void> {
    const alert = await tenantClient.warehouseCapacityAlert.findUnique({
      where: { id: alertId },
    });

    if (!alert) {
      throw new NotFoundException(`Alert with ID ${alertId} not found`);
    }

    await tenantClient.warehouseCapacityAlert.update({
      where: { id: alertId },
      data: {
        isResolved: true,
        resolvedBy: userId,
        resolvedAt: new Date(),
        message: reason ? `${alert.message || ""} (Resolved: ${reason})` : alert.message,
      },
    });

    this.logger.log(`Alert ${alertId} resolved by user ${userId}`);
  }
}
