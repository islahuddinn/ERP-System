import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaClient } from "@prisma/tenant-client";
import { TenantMigrationService } from "./tenant-migration.service";
import { TenantSeedService } from "./tenant-seed.service";
import { EncryptionService } from "../../prisma/encryption.service";
import { getTenantDatabaseName } from "src/common/reuseable-functions/getDatabaseNames";
import { IUpdateTenantDbConnectionResponse } from "../utils/interfaces";
import { execSync } from "child_process";
import { MasterPrismaService } from "src/master-prisma/master-prisma.service";
import { MultiTenantPrismaService } from "src/prisma/multi-tenant-prisma.service";
import {
  createSecurePgClient,
  postgresDatabaseName,
  toDirectPostgresConnectionString,
  withPostgresDatabaseName,
} from "src/common/utils/postgres-url";

/**
 * Service for provisioning tenant databases
 *
 * This service:
 * 1. Validates database connection string
 * 2. Tests database connectivity
 * 3. Runs Prisma migrations
 * 4. Seeds default data
 * 5. Creates tenant admin user
 *
 * Note: Database must be created manually by the user
 */
@Injectable()
export class TenantProvisioningService {
  private readonly logger = new Logger(TenantProvisioningService.name);
  private readonly idempotencyCache = new Map<
    string,
    { encryptedUrl: string; databaseName: string; databaseUrl?: string }
  >();

  constructor(
    private readonly migrationService: TenantMigrationService,
    private readonly seedService: TenantSeedService,
    private readonly encryptionService: EncryptionService,
    private readonly masterPrismaService: MasterPrismaService,
    private readonly multiTenantPrismaService: MultiTenantPrismaService,
  ) {}

  /**
   * Ensure that the target database in the connection string exists.
   * If it does not exist, create it using a superuser connection to the same host.
   *
   * This removes the manual "CREATE DATABASE" step when onboarding a new tenant.
   */
  private maintenanceConnectionString(connectionString: string): string {
    // Connect to a database that already exists (env DATABASE_URL, or the
    // incoming URL). Neon has no `postgres` db, rejects non-SSL connections,
    // and the pooler cannot CREATE DATABASE — use the direct host for DDL.
    const source = process.env.DATABASE_URL || connectionString;
    return toDirectPostgresConnectionString(source);
  }

  private async ensureDatabaseExists(connectionString: string): Promise<{
    databaseName: string;
    created: boolean;
  }> {
    const databaseName = postgresDatabaseName(connectionString);
    const adminClient = createSecurePgClient(this.maintenanceConnectionString(connectionString));

    await adminClient.connect();

    try {
      this.logger.log(`Checking if tenant database "${databaseName}" exists...`);

      const result = await adminClient.query("SELECT 1 FROM pg_database WHERE datname = $1", [
        databaseName,
      ]);

      if (result.rowCount && result.rowCount > 0) {
        this.logger.log(`Tenant database "${databaseName}" already exists.`);
        return { databaseName, created: false };
      }

      this.logger.log(`Creating tenant database "${databaseName}"...`);
      await adminClient.query(`CREATE DATABASE "${databaseName}"`);
      this.logger.log(`✅ Tenant database created: "${databaseName}"`);

      return { databaseName, created: true };
    } catch (error: any) {
      const message = String(error?.message || error);
      if (/insecure|sslmode/i.test(message)) {
        throw new BadRequestException(
          "Database connection is insecure. Use a URL with sslmode=require (Neon requires SSL). Do not strip query params from DATABASE_URL.",
        );
      }
      if (/create database|permission|not supported|must be owner/i.test(message)) {
        throw new BadRequestException(
          `Could not create database "${databaseName}". Neon pooler endpoints often cannot CREATE DATABASE — create it in the Neon console or use the direct (non-pooler) host. ${message}`,
        );
      }
      throw new BadRequestException(`Failed to prepare tenant database "${databaseName}": ${message}`);
    } finally {
      await adminClient.end().catch(() => undefined);
    }
  }

  private buildTenantConnectionString(baseConnectionString: string, databaseName: string): string {
    return withPostgresDatabaseName(baseConnectionString, databaseName);
  }

  private generateDatabaseName(seed: string): string {
    const normalized = seed
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return `tenant_${normalized || "org"}_${suffix}`.slice(0, 63);
  }

  private async dropDatabaseIfExists(connectionString: string, databaseName: string) {
    const adminClient = createSecurePgClient(this.maintenanceConnectionString(connectionString));

    await adminClient.connect();

    try {
      this.logger.warn(
        `Rolling back tenant provisioning. Dropping database "${databaseName}" if it exists...`,
      );

      // Terminate existing connections then drop DB
      await adminClient.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1`,
        [databaseName],
      );
      await adminClient.query(`DROP DATABASE IF EXISTS "${databaseName}"`);

      this.logger.warn(`✅ Tenant database "${databaseName}" dropped as part of rollback.`);
    } catch (error: any) {
      this.logger.error(
        `Failed to drop tenant database "${databaseName}" during rollback: ${error.message}`,
      );
    } finally {
      await adminClient.end().catch(() => undefined);
    }
  }

  /**
   * Validate database connection string format
   * @param connectionString - Database connection string
   * @returns { valid: boolean; message?: string }
   */
  validateConnectionString(connectionString: string): {
    valid: boolean;
    message?: string;
  } {
    if (!connectionString || typeof connectionString !== "string") {
      return { valid: false, message: "Connection string is required" };
    }

    // Check if it's a valid PostgreSQL connection string
    const postgresPattern = /^postgresql:\/\/.+/i;
    if (!postgresPattern.test(connectionString)) {
      return {
        valid: false,
        message: "Invalid connection string format. Must start with postgresql://",
      };
    }

    // Check for common issues
    // Check for unencoded spaces (spaces should be URL-encoded as %20)
    if (connectionString.includes(" ") && !connectionString.includes("%20")) {
      return {
        valid: false,
        message:
          "Connection string contains unencoded spaces. Database names with spaces should be URL-encoded (%20) or better yet, rename the database to use underscores (tenant_example instead of tenant example). Recommended: Rename database in pgAdmin to use underscore.",
      };
    }

    if (!connectionString.includes("schema=public")) {
      this.logger.warn("Connection string does not specify schema=public. This may cause issues.");
    }

    return { valid: true };
  }

  /**
   * Test database connectivity
   * @param connectionString - Database connection string
   * @returns Promise<boolean>
   */
  async testConnection(connectionString: string): Promise<boolean> {
    this.logger.log("Testing database connection...");

    let client: PrismaClient | null = null;

    try {
      // Create a temporary Prisma client
      client = new PrismaClient({
        datasources: {
          db: {
            url: connectionString,
          },
        },
      } as any);

      // Try to connect
      await client.$connect();

      // Try a simple query
      await client.$queryRaw`SELECT 1`;

      this.logger.log("✅ Database connection successful");
      return true;
    } catch (error: any) {
      this.logger.error(`❌ Database connection failed: ${error.message}`);

      // Provide more helpful error messages
      if (error.message?.includes("Authentication failed")) {
        this.logger.error(
          "💡 Tip: Check your PostgreSQL username and password in the connection string",
        );
      } else if (error.message?.includes("does not exist")) {
        this.logger.error(
          "💡 Tip: The database does not exist. Please create it first using: CREATE DATABASE database_name;",
        );
      } else if (error.message?.includes("ECONNREFUSED")) {
        this.logger.error(
          "💡 Tip: PostgreSQL server is not running or not accessible at the specified host/port",
        );
      }

      return false;
    } finally {
      // Always disconnect
      if (client) {
        await client.$disconnect().catch(() => {});
      }
    }
  }

  /**
   * Complete provisioning workflow for a tenant database
   * @param connectionString - Database connection string
   * @param adminEmail - Email for tenant admin user
   * @param adminPassword - Password for tenant admin user
   * @returns Promise<{ encryptedUrl: string }>
   */
  async provisionTenant(
    baseConnectionString: string,
    tenantName: string,
    adminEmail: string,
    adminPassword: string,
    shortTenantId: string,
    requestId?: string,
  ): Promise<{ encryptedUrl: string; databaseName: string; databaseUrl?: string }> {
    this.logger.log("Starting tenant provisioning...");

    if (requestId && this.idempotencyCache.has(requestId)) {
      return this.idempotencyCache.get(requestId)!;
    }
    const databaseName = this.generateDatabaseName(tenantName);
    const connectionString = this.buildTenantConnectionString(baseConnectionString, databaseName);

    /**
     * Step 1: Validate connection string
     */
    const validation = this.validateConnectionString(connectionString);

    if (!validation.valid) {
      throw new BadRequestException(
        validation.message ||
          "Invalid database connection string format. Must be a PostgreSQL connection string.",
      );
    }

    // Step 2: Ensure database exists (create it if necessary)
    const { databaseName: ensuredDatabaseName, created } =
      await this.ensureDatabaseExists(connectionString);

    // Step 3: Test connection to the freshly created (or existing) database
    const isConnected = await this.testConnection(connectionString);
    if (!isConnected) {
      throw new BadRequestException(
        "Failed to connect to database. Please verify the connection string and ensure the database exists.",
      );
    }

    // Step 4: Check if already migrated
    const isMigrated = await this.migrationService.isMigrated(connectionString);
    if (isMigrated) {
      this.logger.warn("Database appears to be already migrated. Skipping migrations...");
    } else {
      // Step 5: Run migrations
      this.logger.log("Running migrations...");
      await this.migrationService.runMigrations(connectionString);
    }

    // Step 6: Create tenant client for seeding
    const tenantClient = new PrismaClient({
      datasources: {
        db: {
          url: connectionString,
        },
      },
    } as any);

    try {
      await tenantClient.$connect();

      // Step 7: Seed default data
      this.logger.log("Seeding default data...");
      await this.seedService.seedDefaultData(
        tenantClient,
        adminEmail,
        adminPassword,
        shortTenantId,
      );

      // Step 8: Encrypt connection string for storage
      const encryptedUrl = this.encryptionService.encrypt(connectionString);

      this.logger.log("✅ Tenant provisioning completed successfully");

      const result = { encryptedUrl, databaseName, databaseUrl: connectionString };
      if (requestId) {
        this.idempotencyCache.set(requestId, result);
      }
      return result;
    } catch (error: any) {
      this.logger.error(`❌ Provisioning failed: ${error.message}`);
      if (created) {
        // Only attempt rollback DB drop if we created it in this run
        await this.dropDatabaseIfExists(connectionString, ensuredDatabaseName);
      }
      throw new BadRequestException(`Failed to provision tenant: ${error.message}`);
    } finally {
      // Always disconnect
      await tenantClient.$disconnect().catch(() => {});
    }
  }

  /**
   * Validate and test connection without provisioning
   * Useful for validating connection string before creating tenant
   * @param connectionString - Database connection string
   * @returns Promise<{ valid: boolean; message: string }>
   */
  async validateAndTestConnection(
    connectionString: string,
  ): Promise<{ valid: boolean; message: string }> {
    // Validate format
    const formatValidation = this.validateConnectionString(connectionString);
    if (!formatValidation.valid) {
      return {
        valid: false,
        message:
          formatValidation.message ||
          "Invalid connection string format. Must be a PostgreSQL connection string (postgresql://...)",
      };
    }

    // Test connection
    const isConnected = await this.testConnection(connectionString);
    if (!isConnected) {
      return {
        valid: false,
        message:
          "Failed to connect to database. Please verify the connection string and ensure the database exists and is accessible.",
      };
    }

    return {
      valid: true,
      message: "Connection string is valid and database is accessible.",
    };
  }

  async provisionDedicatedTenant(payload: {
    baseConnectionString: string;
    tenantName: string;
    email: string;
    password: string;
    shortTenantId: string;
    requestId?: string;
  }) {
    const { baseConnectionString, tenantName, email, password, shortTenantId, requestId } = payload;

    const databaseName = this.generateDatabaseName(shortTenantId);

    const connectionString = this.buildTenantConnectionString(baseConnectionString, databaseName);

    const validation = this.validateConnectionString(connectionString);

    if (!validation.valid) {
      throw new BadRequestException(validation.message);
    }

    const { created } = await this.ensureDatabaseExists(connectionString);

    await this.migrationService.runMigrations(connectionString);

    const prisma = new PrismaClient({
      datasources: { db: { url: connectionString } },
    });

    try {
      await prisma.$connect();

      await this.bootstrapTenantData(prisma, email, password, shortTenantId);

      const encryptedUrl = this.encryptionService.encrypt(connectionString);

      const result = {
        encryptedUrl,
        databaseName,
        databaseUrl: connectionString,
      };

      if (requestId) {
        this.idempotencyCache.set(requestId, result);
      }

      return result;
    } catch (err) {
      if (created) {
        await this.dropDatabaseIfExists(connectionString, databaseName);
      }
      throw err;
    } finally {
      await prisma.$disconnect().catch(() => {});
    }
  }

  async provisionSharedTenant(payload: {
    connectionString: string;
    tenantName: string;
    email: string;
    password: string;
    shortTenantId: string;
  }) {
    const { connectionString, email, password, shortTenantId } = payload;

    const prisma = new PrismaClient({
      datasources: { db: { url: connectionString } },
    });

    await prisma.$connect();

    try {
      await this.bootstrapTenantData(prisma, email, password, shortTenantId);

      return {
        encryptedUrl: this.encryptionService.encrypt(connectionString),
        databaseName: getTenantDatabaseName(),
        databaseUrl: connectionString,
      };
    } finally {
      await prisma.$disconnect().catch(() => {});
    }
  }

  async updateTenantDatabaseConnection(payload: {
    dbUrl: string;
    tenantName: string;
    email: string;
    password: string;
    requestId?: string;
    shortTenantId: string;
  }): Promise<IUpdateTenantDbConnectionResponse> {
    const { dbUrl, tenantName, email, password, requestId, shortTenantId } = payload;

    /**
     * 1. Validate connection string
     */
    const validation = this.validateConnectionString(dbUrl);

    if (!validation.valid) {
      throw new BadRequestException(validation.message);
    }

    const prisma = new PrismaClient({
      datasources: { db: { url: dbUrl } },
    });

    try {
      /**
       * 2. Test DB connection (no provisioning)
       */
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;

      /**
       * 3. Extract database name
       */
      const url = new URL(dbUrl);
      const databaseName = url.pathname.replace("/", "");

      /**
       * 4. Encrypt connection string
       */
      const encryptedUrl = this.encryptionService.encrypt(dbUrl);

      /**
       * 5. Prepare result (ONLY safe data)
       */
      const result: IUpdateTenantDbConnectionResponse = {
        encryptedUrl,
        databaseName,
      };

      /**
       * 6. Idempotency cache (temporary)
       */
      if (requestId) {
        this.idempotencyCache.set(requestId, result);
      }

      return result;
    } catch (err: any) {
      throw new BadRequestException(`Failed to connect to database: ${err.message}`);
    } finally {
      await prisma.$disconnect().catch(() => {});
    }
  }

  private async bootstrapTenantData(
    prisma: PrismaClient,
    adminEmail: string,
    adminPassword: string,
    tenantId: string,
  ) {
    await this.seedService.seedDefaultData(prisma, adminEmail, adminPassword, tenantId);
  }

  // ─── tenant-provisioning.service.ts ───────────────────────────────────────

  async provisionSchemaTenant(payload: {
    tenantId: string;
    schemaName: string;
    adminEmail: string;
    adminPassword: string;
    shortTenantId: string;
  }) {
    const { tenantId, schemaName, adminEmail, adminPassword, shortTenantId } = payload;

    const baseUrl = process.env.DATABASE_URL;
    if (!baseUrl) throw new Error("DATABASE_URL is not defined");

    const tenantDbUrl = withPostgresDatabaseName(baseUrl, schemaName);

    // Step 1: Create the tenant database
    const { created } = await this.ensureDatabaseExists(tenantDbUrl);

    try {
      // Step 2: Run migrations against the new database
      await this.runTenantMigrations(schemaName);

      // Step 3: Seed default data
      await this.seedTenantData({ tenantId, schemaName, adminEmail, adminPassword, shortTenantId });
    } catch (err) {
      if (created) {
        await this.dropDatabaseIfExists(tenantDbUrl, schemaName).catch((dropErr) => {
          this.logger.error(`⚠️ Failed to rollback database "${schemaName}":`, dropErr);
        });
      }
      throw err;
    }
  }

  private async runTenantMigrations(schemaName: string) {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) throw new Error("DATABASE_URL is not defined");

    const tenantDbUrl = withPostgresDatabaseName(dbUrl, schemaName, { schema: "public" });

    // db push is used instead of migrate deploy because the migration history
    // is incomplete (contains ALTER-only migrations that assume prior db push state).
    // New schemas are always empty so --accept-data-loss is safe here.
    execSync(
      `npx prisma db push --schema=prisma/tenant/schema.prisma --accept-data-loss --skip-generate`,
      {
        stdio: "inherit",
        env: {
          ...process.env,
          DATABASE_URL: tenantDbUrl,
        },
      },
    );
  }

  private async seedTenantData(payload: {
    tenantId: string;
    schemaName: string;
    adminEmail: string;
    adminPassword: string;
    shortTenantId: string;
  }) {
    const { tenantId, schemaName, adminEmail, adminPassword } = payload;

    const client = await this.multiTenantPrismaService.getOrCreateClient(schemaName);
    await this.bootstrapTenantData(client, adminEmail, adminPassword, tenantId);
  }

  // private async seedTenantData(payload: {
  //   schemaName: string;
  //   adminEmail: string;
  //   adminPassword: string;
  //   shortTenantId: string;
  // }) {
  //   const { schemaName, adminEmail, adminPassword, shortTenantId } = payload;

  //   const dbUrl = process.env.DATABASE_URL;
  //   const baseUrl = dbUrl.split("?")[0];

  //   // FIX: ?schema= in the URL is the correct way to scope Prisma to a schema.
  //   // This works at the driver level — no SET search_path needed.
  //   const prisma = new PrismaClient({
  //     datasources: {
  //       db: { url: `${baseUrl}?schema=${schemaName}` },
  //     },
  //   });

  //   try {
  //     await prisma.$connect();
  //     await this.bootstrapTenantData(prisma, adminEmail, adminPassword, shortTenantId);
  //   } finally {
  //     await prisma.$disconnect();
  //   }
  // }
}
