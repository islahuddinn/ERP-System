import { Injectable, Logger } from "@nestjs/common";
import { PrismaClient } from "@prisma/tenant-client";
import { exec } from "child_process";
import { promisify } from "util";
import path from "path";

const execAsync = promisify(exec);

/**
 * Service for running Prisma migrations on tenant databases
 */
@Injectable()
export class TenantMigrationService {
  private readonly logger = new Logger(TenantMigrationService.name);

  /**
   * Run all pending migrations on a tenant database
   * @param connectionString - Database connection string
   * @returns Promise<void>
   */
  async runMigrations(connectionString: string): Promise<void> {
    this.logger.log("🚀 Starting tenant migrations...");

    const schemaPath = "/app/prisma/tenant/schema.prisma";

    try {
      await this.runPrismaCommand("npx prisma migrate deploy", connectionString);

      const schemaVerified = await this.verifyCoreSchema(connectionString);

      if (!schemaVerified) {
        throw new Error("Schema verification failed after migration deploy");
      }

      this.logger.log("✅ Migrations completed successfully");
    } catch (error: any) {
      this.logger.error(`❌ Migration failed: ${error.message}`);
      throw new Error(`Failed to run migrations: ${error.message}`);
    }
  }
  /**
   * Check if database has been migrated
   * @param connectionString - Database connection string
   * @returns Promise<boolean>
   */
  async isMigrated(connectionString: string): Promise<boolean> {
    try {
      const schemaPath = "/app/prisma/tenant/schema.prisma";

      const { stdout } = await execAsync(`npx prisma migrate status --schema=${schemaPath}`, {
        env: {
          ...process.env,
          DATABASE_URL: connectionString,
        },
        cwd: "/app",
      });

      return !stdout.includes("Database schema is not up to date");
    } catch {
      return false;
    }
  }

  /**
   * Get the backend directory path (tenant schema lives at prisma/tenant/schema.prisma)
   */
  private getBackendDirectory(): string {
    const cwd = process.cwd();
    if (cwd.endsWith("backend")) {
      return cwd;
    }
    if (cwd.includes("backend")) {
      return cwd.split("backend")[0] + "backend";
    }
    return cwd;
  }

  private async runPrismaCommand(command: string, connectionString: string): Promise<void> {
    const schemaPath = path.resolve(process.cwd(), "prisma/tenant/schema.prisma");

    const env = {
      ...process.env,
      DATABASE_URL: connectionString,
    };

    const args = ["prisma", "migrate", "deploy", "--schema", schemaPath];

    this.logger.log(`EXECUTING: npx ${args.join(" ")}`);

    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const execFileAsync = promisify(execFile);

    const { stdout, stderr } = await execFileAsync("npx", args, {
      env,
      cwd: process.cwd(),
    });

    if (stderr && !stderr.includes("warn")) {
      this.logger.warn(stderr);
    }

    if (stdout) {
      this.logger.debug(stdout);
    }
  }

  private async verifyCoreSchema(connectionString: string): Promise<boolean> {
    const tempClient = new PrismaClient({
      datasources: {
        db: {
          url: connectionString,
        },
      },
    } as any);

    try {
      await this.ensureCoreTables(tempClient);
      return true;
    } catch (error) {
      this.logger.warn("Core tenant tables are missing.");
      return false;
    } finally {
      await tempClient.$disconnect().catch(() => undefined);
    }
  }

  private async ensureCoreTables(client: PrismaClient): Promise<void> {
    // Core user and permission tables
    await client.user.count();
    await client.uOM.count();
    await client.permission.count();

    // Warehouse management tables (Phase 1)
    await client.warehouse.count();
    await client.warehouseZone.count();
    await client.warehouseStockBalance.count();
    await client.warehouseCapacityAlert.count();
    await client.rawMaterialBatch.count();
  }

  private isFailedMigrationError(error: any): boolean {
    return Boolean(error?.message?.includes("P3009"));
  }

  private async handleFailedMigration(connectionString: string, originalError: any): Promise<void> {
    try {
      const failedMigration = this.extractFailedMigrationName(originalError?.message);

      if (failedMigration) {
        this.logger.warn(`Marking migration ${failedMigration} as rolled back...`);
        await this.runPrismaCommand(
          `npx prisma migrate resolve --rolled-back ${failedMigration}`,
          connectionString,
        );
      }

      this.logger.warn("Resetting tenant database and reapplying migrations...");
      await this.runPrismaCommand("npx prisma migrate reset --force --skip-seed", connectionString);
      await this.runPrismaCommand("npx prisma migrate deploy", connectionString);
    } catch (recoveryError: any) {
      throw new Error(`Failed to recover from migration error: ${recoveryError.message}`);
    }
  }

  private extractFailedMigrationName(message?: string): string | null {
    if (!message) {
      return null;
    }

    const match = message.match(/The `(\w+)` migration/);
    return match?.[1] || null;
  }

  /**
   * Update existing tenant database schema by running pending migrations
   * This is used to update existing tenants to the latest schema version
   * @param connectionString - Database connection string
   * @returns Promise<{ success: boolean; message: string; migrationsApplied?: number }>
   */
  async updateTenantSchema(connectionString: string): Promise<{
    success: boolean;
    message: string;
    migrationsApplied?: number;
  }> {
    this.logger.log("Starting schema update for existing tenant...");

    try {
      // First, check current migration status to see if there are pending migrations
      const migrationStatusBefore = await this.getMigrationStatus(connectionString);
      const pendingCountBefore = migrationStatusBefore.pendingMigrations.length;

      this.logger.log(`Found ${pendingCountBefore} pending migration(s)`);

      // If no pending migrations, check if schema is up to date
      if (pendingCountBefore === 0) {
        const schemaVerified = await this.verifyCoreSchema(connectionString);
        if (schemaVerified) {
          this.logger.log("✅ Schema is already up to date");
          return {
            success: true,
            message: "Schema is already up to date. No migrations needed.",
            migrationsApplied: 0,
          };
        } else {
          this.logger.warn(
            "No pending migrations but schema verification failed. This may indicate missing migration files.",
          );
        }
      }

      // Run pending migrations
      this.logger.log("Running pending migrations...");
      await this.runPrismaCommand("npx prisma migrate deploy", connectionString);

      // Verify schema after update
      const schemaVerified = await this.verifyCoreSchema(connectionString);
      if (!schemaVerified) {
        // If schema verification fails, try db push as a last resort (for existing tenants, this is safer than reset)
        this.logger.warn(
          "Schema verification failed after migrations. Attempting db push to sync schema...",
        );
        try {
          await this.runPrismaCommand(
            "npx prisma db push --accept-data-loss --skip-generate",
            connectionString,
          );
          const verifiedAfterPush = await this.verifyCoreSchema(connectionString);
          if (!verifiedAfterPush) {
            throw new Error(
              "Schema verification failed after db push. Some tables may be missing or schema may be out of sync.",
            );
          }
          this.logger.log("Schema synced using db push");
        } catch (pushError: any) {
          this.logger.error(`Db push also failed: ${pushError.message}`);
          throw new Error(`Schema verification failed after migrations: ${pushError.message}`);
        }
      }

      // Get updated migration status
      const migrationStatusAfter = await this.getMigrationStatus(connectionString);
      const migrationsApplied = pendingCountBefore;

      this.logger.log(
        `✅ Schema update completed successfully. Applied ${migrationsApplied} migration(s)`,
      );
      return {
        success: true,
        message: `Schema updated successfully. Applied ${migrationsApplied} migration(s).`,
        migrationsApplied,
      };
    } catch (error: any) {
      this.logger.error(`❌ Schema update failed: ${error.message}`);
      if (error.stdout) {
        this.logger.error(`Migration stdout: ${error.stdout}`);
      }
      if (error.stderr) {
        this.logger.error(`Migration stderr: ${error.stderr}`);
      }
      return {
        success: false,
        message: `Failed to update schema: ${error.message}`,
      };
    }
  }

  /**
   * Get migration status for a tenant database
   * @param connectionString - Database connection string
   * @returns Promise with migration status information
   */
  private async getMigrationStatus(connectionString: string): Promise<{
    appliedMigrations: string[];
    pendingMigrations: string[];
    isUpToDate: boolean;
  }> {
    try {
      // Use Prisma migrate status to get migration information
      const env = {
        ...process.env,
        DATABASE_URL: connectionString,
      };

      const backendDir = this.getBackendDirectory();

      const { stdout, stderr } = await execAsync("npx prisma migrate status", {
        env,
        cwd: backendDir,
      });

      const output = stdout || stderr || "";
      const appliedMigrations: string[] = [];
      const pendingMigrations: string[] = [];

      // Check if database is up to date
      if (
        output.includes("Database schema is up to date") ||
        output.includes("following migration have been applied")
      ) {
        return {
          appliedMigrations: [],
          pendingMigrations: [],
          isUpToDate: true,
        };
      }

      // Parse pending migrations from output
      // Prisma migrate status shows pending migrations like:
      // "X migration(s) found in prisma/migrations that have not yet been applied"
      // Or lists them individually
      const pendingMatch = output.match(/(\d+)\s+migration.*?not yet been applied/i);
      if (pendingMatch) {
        const count = parseInt(pendingMatch[1], 10);
        // Extract migration names if listed
        const migrationLines = output
          .split("\n")
          .filter(
            (line) =>
              line.includes("migrations/") &&
              (line.includes("(not yet applied)") || line.match(/^\s*\d{14}_/)),
          );

        if (migrationLines.length > 0) {
          migrationLines.forEach((line) => {
            const nameMatch = line.match(/(\d{14}_[^\s\(]+)/);
            if (nameMatch) {
              pendingMigrations.push(nameMatch[1]);
            }
          });
        } else {
          // If we can't parse names, just set count
          for (let i = 0; i < count; i++) {
            pendingMigrations.push(`pending_${i + 1}`);
          }
        }
      }

      // Parse applied migrations if available
      const appliedMatch = output.match(/(\d+)\s+migration.*?been applied/i);
      if (appliedMatch) {
        // Extract applied migration names if listed
        const appliedLines = output
          .split("\n")
          .filter((line) => line.includes("migrations/") && !line.includes("not yet applied"));

        appliedLines.forEach((line) => {
          const nameMatch = line.match(/(\d{14}_[^\s\(]+)/);
          if (nameMatch) {
            appliedMigrations.push(nameMatch[1]);
          }
        });
      }

      return {
        appliedMigrations,
        pendingMigrations,
        isUpToDate: pendingMigrations.length === 0,
      };
    } catch (error: any) {
      // If migrate status fails, it might mean migrations haven't been initialized
      // or database doesn't exist yet
      this.logger.debug(`Could not get detailed migration status: ${error.message}`);
      return {
        appliedMigrations: [],
        pendingMigrations: [],
        isUpToDate: false,
      };
    }
  }
}
