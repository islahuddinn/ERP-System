import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { MultiTenantPrismaService } from "../../prisma/multi-tenant-prisma.service";
import { MasterPrismaService } from "../../master-prisma/master-prisma.service";
import { CapacityService } from "../../common/services/capacity.service";
import { TenantStatus } from "@prisma/master-client";

/**
 * Scheduled tasks for capacity monitoring
 * Runs hourly to check and update warehouse capacities
 */
@Injectable()
export class CapacitySchedulerService {
  private readonly logger = new Logger(CapacitySchedulerService.name);

  constructor(
    private readonly multiTenantPrisma: MultiTenantPrismaService,
    private readonly masterPrisma: MasterPrismaService,
    private readonly capacityService: CapacityService,
  ) {}

  /**
   * Hourly capacity check for all active warehouses
   * Runs every hour at minute 0
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleCapacityMonitoring() {
    this.logger.log("Starting hourly capacity monitoring...");

    try {
      // Get all tenants from master database
      const tenants = await this.masterPrisma.tenant.findMany({
        where: {
          status: TenantStatus.ACTIVE,
        },
        select: {
          id: true,
          name: true,
        },
      });

      this.logger.log(`Found ${tenants.length} active tenants`);

      for (const tenant of tenants) {
        try {
          const tenantClient = await this.multiTenantPrisma.getTenantClient(tenant.id);

          if (tenantClient) {
            await this.capacityService.updateAllWarehouseCapacities(tenantClient);
            this.logger.log(`Updated capacities for tenant: ${tenant.name} (${tenant.id})`);
          }
        } catch (error) {
          this.logger.error(`Failed to update capacities for tenant ${tenant.id}:`, error);
          // Continue with next tenant
        }
      }

      this.logger.log("Hourly capacity monitoring completed");
    } catch (error) {
      this.logger.error("Error in hourly capacity monitoring:", error);
    }
  }

  /**
   * Daily capacity check (backup)
   * Runs every day at 2 AM
   */
  @Cron("0 2 * * *")
  async handleDailyCapacityCheck() {
    this.logger.log("Starting daily capacity check...");
    await this.handleCapacityMonitoring();
  }
}
