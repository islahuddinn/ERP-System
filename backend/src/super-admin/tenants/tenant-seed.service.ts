import { Injectable, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/tenant-client";
import * as bcrypt from "bcrypt";
import { PermissionsSeedService } from "../../users/permissions/permissions-seed.service";
import { UOM_SEED_FLAT } from "../../uoms/utils/uom-seed-data";

/**
 * Service for seeding default data into tenant databases
 */
@Injectable()
export class TenantSeedService {
  private readonly logger = new Logger(TenantSeedService.name);

  constructor(private readonly permissionsSeedService: PermissionsSeedService) {}

  /**
   * Seed default data into tenant database
   * @param tenantClient - Prisma client connected to tenant database
   * @param adminEmail - Email for tenant admin user
   * @param adminPassword - Password for tenant admin user
   * @returns Promise<void>
   */
  async seedDefaultData(
    tenantClient: PrismaClient,
    adminEmail: string,
    adminPassword: string,
    tenantId: string,
  ): Promise<void> {
    this.logger.log("Starting seed process for tenant database...");

    try {
      // Seed in order: UOMs -> Companies -> Permissions -> Admin User
      await this.seedUOMs(tenantClient);
      await this.seedCompanies(tenantClient);

      // Seed permissions and role-permission mappings
      await this.permissionsSeedService.seedPermissions(tenantClient);

      // Create admin user
      await this.seedAdminUser(tenantClient, adminEmail, adminPassword, tenantId);

      // Ensure ADMIN has all permissions (safety check)
      await this.permissionsSeedService.ensureAdminHasAllPermissions(tenantClient);

      this.logger.log("✅ Seed completed successfully");
    } catch (error: any) {
      this.logger.error(`❌ Seed failed: ${error.message}`);
      throw new Error(`Failed to seed tenant database: ${error.message}`);
    }
  }

  private async seedUOMs(client: PrismaClient): Promise<void> {
    for (const uom of UOM_SEED_FLAT) {
      await client.uOM.upsert({
        where: { code: uom.code },
        update: { name: uom.name, symbol: uom.symbol, category: uom.category, isSystem: true },
        create: { ...uom, isSystem: true, isActive: true },
      });
    }

    this.logger.log(`✅ Seeded ${UOM_SEED_FLAT.length} system UOMs`);
  }

  /**
   * Seed default Companies
   */
  private async seedCompanies(client: PrismaClient): Promise<void> {
    this.logger.log("Seeding Companies...");

    const defaultCompanies = [{ name: "Default Company", code: "DEF001" }];

    for (const company of defaultCompanies) {
      await client.company.upsert({
        where: { name: company.name },
        update: {},
        create: {
          name: company.name,
          code: company.code,
          isActive: true,
        },
      });
    }

    this.logger.log(`✅ Seeded ${defaultCompanies.length} Companies`);
  }

  /**
   * Seed admin user for tenant
   */
  private async seedAdminUser(
    client: PrismaClient,
    email: string,
    password: string,
    tenantId: string,
  ): Promise<void> {
    this.logger.log("Seeding Admin User...");

    const emailNorm = email.trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(password, 10);

    const adminRole = await client.role.findUnique({ where: { name: "Admin" } });

    if (!adminRole) throw new Error("Admin role not found — run permissions seed first");

    await client.user.upsert({
      where: { email: emailNorm },
      update: {},
      create: {
        firstName: "Admin",
        lastName: "User",
        email: emailNorm,
        password: hashedPassword,
        roleId: adminRole.id,
        loginAccess: "ENABLED",
      },
    });

    this.logger.log(`✅ Seeded Admin User: ${emailNorm}`);
  }
}
