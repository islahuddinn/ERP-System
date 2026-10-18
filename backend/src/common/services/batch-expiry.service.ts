import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaClient } from "@prisma/tenant-client";
import { StockLedgerService } from "./stock-ledger.service";
import { MasterPrismaService } from "../../master-prisma/master-prisma.service";
import { MultiTenantPrismaService } from "../../prisma/multi-tenant-prisma.service";
import { TenantStatus } from "@prisma/master-client";

/**
 * BatchExpiryService - Handles batch expiry management
 *
 * Features:
 * - Auto-mark expired batches via cron job
 * - Prevents consumption of expired batches
 * - Logs expiry events
 */
@Injectable()
export class BatchExpiryService {
  private readonly logger = new Logger(BatchExpiryService.name);

  constructor(
    private readonly stockLedgerService: StockLedgerService,
    private readonly masterPrisma: MasterPrismaService,
    private readonly multiTenantPrisma: MultiTenantPrismaService,
  ) {}

  /**
   * Cron job to mark expired batches
   * Runs daily at 2 AM
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async handleBatchExpiry() {
    this.logger.log("Starting batch expiry check...");

    try {
      // Get all tenants
      const tenants = await this.masterPrisma.tenant.findMany({
        where: { status: TenantStatus.ACTIVE },
        select: { id: true, name: true },
      });

      let totalExpired = 0;

      for (const tenant of tenants) {
        try {
          const tenantClient = await this.multiTenantPrisma.getTenantClient(tenant.id);
          const expiredCount = await this.stockLedgerService.markExpiredBatches(tenantClient);
          totalExpired += expiredCount;

          if (expiredCount > 0) {
            this.logger.log(
              `Tenant ${tenant.name} (${tenant.id}): Marked ${expiredCount} batches as expired`,
            );
          }
        } catch (error) {
          this.logger.error(`Failed to process batch expiry for tenant ${tenant.id}:`, error);
        }
      }

      this.logger.log(`Batch expiry check completed. Total expired batches: ${totalExpired}`);
    } catch (error) {
      this.logger.error("Error in batch expiry cron job:", error);
    }
  }

  /**
   * Manually trigger batch expiry check for a specific tenant
   */
  async checkExpiredBatches(tenantClient: PrismaClient): Promise<number> {
    return this.stockLedgerService.markExpiredBatches(tenantClient);
  }

  /**
   * Get batches expiring within specified days
   */
  async getBatchesExpiringSoon(tenantClient: PrismaClient, days: number = 30) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    return tenantClient.rawMaterialBatch.findMany({
      where: {
        status: "ACTIVE",
        expiryDate: {
          lte: expiryDate,
          gte: new Date(),
        },
        availableQuantity: { gt: 0 },
        deletedAt: null,
      },
      include: {
        rawMaterial: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        site: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: {
        expiryDate: "asc",
      },
    });
  }
}
