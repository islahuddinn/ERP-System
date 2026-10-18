import {
  Injectable,
  Logger,
  OnModuleDestroy,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/tenant-client";
import { MasterPrismaService } from "../master-prisma/master-prisma.service";
import { EncryptionService } from "./encryption.service";
import { TenantResolverService } from "../common/services/tenant-resolver.service";
import { TenantLifecycleService } from "../common/services/tenant-lifecycle.service";
import { TenantStatus } from "@prisma/master-client";
import { withPostgresDatabaseName } from "src/common/utils/postgres-url";

/**
 * Service for managing dynamic Prisma client connections per tenant
 * Caches Prisma clients to avoid reconnection overhead
 * Automatically handles connection pooling and cleanup
 */
@Injectable()
export class MultiTenantPrismaService implements OnModuleDestroy {
  private readonly logger = new Logger(MultiTenantPrismaService.name);

  // Cache of Prisma clients per tenant ID
  private readonly tenantClients = new Map<string, PrismaClient>();
  private readonly clientLastUsed = new Map<string, number>();
  private readonly maxClients = Number(process.env.TENANT_PRISMA_MAX_CLIENTS || 50);
  private readonly idleTtlMs = Number(process.env.TENANT_PRISMA_IDLE_TTL_MS || 15 * 60 * 1000);
  private readonly cleanupIntervalMs = Number(
    process.env.TENANT_PRISMA_CLEANUP_INTERVAL_MS || 60 * 1000,
  );
  private readonly cleanupTimer: NodeJS.Timeout;

  // Track tenant status to handle suspensions
  private readonly tenantStatusCache = new Map<string, { status: TenantStatus }>();

  constructor(
    private readonly masterPrisma: MasterPrismaService,
    private readonly encryptionService: EncryptionService,
    private readonly tenantResolver: TenantResolverService,
    private readonly tenantLifecycle: TenantLifecycleService,
  ) {
    this.cleanupTimer = setInterval(() => {
      this.cleanupIdleClients().catch((error) =>
        this.logger.error(`Idle cleanup error: ${error?.message || error}`),
      );
    }, this.cleanupIntervalMs);
  }

  /**
   * Get Prisma client for a specific tenant
   * @param tenantId - The tenant ID
   * @param forceRefresh - Force refresh the connection (default: false)
   * @returns PrismaClient instance for the tenant
   */
  // async getTenantClient(tenantId: string, forceRefresh: boolean = false): Promise<PrismaClient> {
  //   // Validate tenant ID
  //   if (!tenantId || typeof tenantId !== "string") {
  //     throw new BadRequestException("Invalid tenant ID");
  //   }

  //   const canonicalTenantId = await this.tenantResolver.resolveToId(tenantId);

  //   if (!canonicalTenantId) {
  //     throw new NotFoundException(`Tenant not found: ${tenantId}`);
  //   }

  //   const cacheKey = canonicalTenantId;

  //   // Check cache first (unless forcing refresh)
  //   if (!forceRefresh && this.tenantClients.has(cacheKey)) {
  //     const cachedClient = this.tenantClients.get(cacheKey)!;

  //     // Verify tenant is still active
  //     const { status } = await this.getTenantStatus(cacheKey);
  //     if (status !== TenantStatus.ACTIVE) {
  //       this.logger.warn(`Tenant ${cacheKey} is inactive or suspended, disconnecting...`);
  //       await this.disconnectTenant(cacheKey);
  //       throw new NotFoundException("Tenant is inactive or suspended");
  //     }

  //     // CRITICAL: Validate cached client connection before returning
  //     // This ensures we don't return a broken client from before the fix
  //     try {
  //       await cachedClient.$queryRaw`SELECT 1`;
  //       this.logger.debug(`Using cached client for tenant ${cacheKey}`);
  //       this.clientLastUsed.set(cacheKey, Date.now());
  //       return cachedClient;
  //     } catch (error) {
  //       this.logger.warn(`Cached client for tenant ${cacheKey} is broken, recreating...`);
  //       // Client is broken, remove from cache and create new one
  //       await this.disconnectTenant(cacheKey);
  //       // Fall through to create new client below
  //     }
  //   }

  //   // Get tenant from master database
  //   const tenant = await this.masterPrisma.tenant.findUnique({
  //     where: { id: cacheKey },
  //   });

  //   if (!tenant) {
  //     throw new NotFoundException(`Tenant not found: ${tenantId}`);
  //   }

  //   // Check if tenant is active
  //   if (tenant.status !== TenantStatus.ACTIVE) {
  //     throw new NotFoundException("Tenant is inactive or suspended");
  //   }

  //   // Update status cache
  //   this.tenantStatusCache.set(cacheKey, {
  //     status: tenant.status,
  //   });

  //   // Disconnect existing client if forcing refresh
  //   if (forceRefresh && this.tenantClients.has(cacheKey)) {
  //     await this.disconnectTenant(cacheKey);
  //   }

  //   // Decrypt database URL
  //   let databaseUrl: string;
  //   try {
  //     // databaseUrl = this.encryptionService.decrypt(tenant.databaseUrl);
  //     databaseUrl = process.env.DATABASE_URL;
  //   } catch (error: any) {
  //     this.logger.warn(
  //       `Failed to decrypt database URL for tenant ${cacheKey}: ${error.message}, treating as plaintext`,
  //     );
  //     // If decryption fails, assume it's plaintext (backward compatibility)
  //     // databaseUrl = tenant.databaseUrl;
  //   }

  //   // Validate database URL format
  //   if (!databaseUrl || !databaseUrl.startsWith("postgresql://")) {
  //     this.logger.error(
  //       `Invalid database URL format for tenant ${cacheKey}: ${databaseUrl?.substring(0, 50)}...`,
  //     );
  //     throw new BadRequestException("Invalid database connection string format");
  //   }

  //   // Ensure connection timeout and pool parameters are present
  //   try {
  //     const urlObj = new URL(databaseUrl);
  //     if (!urlObj.searchParams.has("connect_timeout")) {
  //       urlObj.searchParams.set("connect_timeout", "30");
  //     }
  //     if (!urlObj.searchParams.has("pool_timeout")) {
  //       urlObj.searchParams.set("pool_timeout", "30");
  //     }
  //     if (!urlObj.searchParams.has("statement_timeout")) {
  //       urlObj.searchParams.set("statement_timeout", "30000");
  //     }
  //     databaseUrl = urlObj.toString();
  //   } catch (urlError) {
  //     // If URL parsing fails, append parameters manually
  //     this.logger.warn(`Could not parse database URL as URL object, appending parameters manually`);
  //     const separator = databaseUrl.includes("?") ? "&" : "?";
  //     if (!databaseUrl.includes("connect_timeout")) {
  //       databaseUrl = `${databaseUrl}${separator}connect_timeout=30`;
  //     }
  //     if (!databaseUrl.includes("pool_timeout")) {
  //       databaseUrl = `${databaseUrl}&pool_timeout=30`;
  //     }
  //   }

  //   this.logger.log(
  //     `Connecting to tenant database ${cacheKey} at ${databaseUrl.replace(/:[^:@]+@/, ":****@").split("?")[0]}`,
  //   );

  //   // CRITICAL FIX: Prisma Client reads DATABASE_URL from environment at module load time
  //   // We need to ensure the custom URL is used by explicitly setting it in datasources
  //   // AND temporarily overriding the environment variable during client creation

  //   // Save original DATABASE_URL
  //   const originalDatabaseUrl = process.env.DATABASE_URL;

  //   // Override DATABASE_URL before creating client
  //   // This ensures Prisma uses our tenant-specific URL
  //   process.env.DATABASE_URL = databaseUrl;

  //   this.logger.debug(`Creating PrismaClient for tenant ${cacheKey}`);

  //   // CRITICAL: Force binary engine type before PrismaClient instantiation
  //   // Prisma v7 requires this environment variable at runtime
  //   // We force it here to ensure it's always set, even if it was unset somehow
  //   process.env.PRISMA_CLIENT_ENGINE_TYPE = "binary";

  //   // Create new Prisma client for this tenant with explicit datasource URL
  //   const client = new PrismaClient({
  //     datasources: {
  //       db: {
  //         url: databaseUrl, // Explicit URL in datasource
  //       },
  //     },
  //     log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  //   } as any);

  //   // Restore original DATABASE_URL immediately after client creation
  //   // This prevents affecting other operations
  //   if (originalDatabaseUrl !== undefined) {
  //     process.env.DATABASE_URL = originalDatabaseUrl;
  //   } else {
  //     delete process.env.DATABASE_URL;
  //   }

  //   this.logger.debug(`PrismaClient created for tenant ${cacheKey}, DATABASE_URL restored`);

  //   // Test connection with retry logic and comprehensive error handling
  //   const maxRetries = 3;
  //   let lastError: Error | null = null;

  //   for (let attempt = 1; attempt <= maxRetries; attempt++) {
  //     try {
  //       this.logger.log(
  //         `[Tenant ${cacheKey}] Connection attempt ${attempt}/${maxRetries} to ${databaseUrl.replace(/:[^:@]+@/, ":****@").split("?")[0]}`,
  //       );

  //       // IMPORTANT: Prisma Client connection in NestJS context
  //       // We need to ensure the client is properly initialized before connecting
  //       // Try connecting with explicit timeout handling
  //       try {
  //         // First, ensure we're not already connected (this can cause issues)
  //         await client.$disconnect().catch(() => {
  //           // Ignore if not connected
  //         });
  //       } catch (disconnectError) {
  //         // Ignore disconnect errors
  //       }

  //       // Now connect with timeout
  //       const connectPromise = client.$connect();
  //       const timeoutPromise = new Promise<never>((_, reject) =>
  //         setTimeout(() => reject(new Error("Connection timeout after 30 seconds")), 30000),
  //       );

  //       await Promise.race([connectPromise, timeoutPromise]);

  //       // Verify connection with a simple query (with timeout)
  //       const queryPromise = client.$queryRaw`SELECT 1 as test`;
  //       const queryTimeoutPromise = new Promise<never>((_, reject) =>
  //         setTimeout(() => reject(new Error("Query timeout after 10 seconds")), 10000),
  //       );

  //       await Promise.race([queryPromise, queryTimeoutPromise]);

  //       this.logger.log(
  //         `✅ Connected to tenant database: ${cacheKey}${tenantId !== cacheKey ? ` (resolved from ${tenantId})` : ""}`,
  //       );
  //       break; // Success, exit retry loop
  //     } catch (error: any) {
  //       lastError = error;
  //       const errorDetails = {
  //         message: error.message,
  //         code: error.code,
  //         name: error.name,
  //         meta: error.meta,
  //       };

  //       this.logger.error(
  //         `[Tenant ${cacheKey}] Connection attempt ${attempt}/${maxRetries} failed:`,
  //         JSON.stringify(errorDetails, null, 2),
  //       );

  //       // Log specific error types for debugging
  //       if (error.code === "P1001" || error.message?.includes("Can't reach database server")) {
  //         this.logger.error(
  //           `[Tenant ${cacheKey}] Database server unreachable. Check:` +
  //             `\n  1. PostgreSQL is running on ${databaseUrl.match(/@([^:]+):(\d+)/)?.[0] || "the configured host:port"}` +
  //             `\n  2. Network connectivity to the database server` +
  //             `\n  3. Firewall rules allow connections` +
  //             `\n  4. Database URL is correct: ${databaseUrl.replace(/:[^:@]+@/, ":****@")}`,
  //         );
  //       } else if (error.code === "P1000" || error.message?.includes("Authentication failed")) {
  //         this.logger.error(
  //           `[Tenant ${cacheKey}] Authentication failed. Check database credentials in connection string.`,
  //         );
  //       } else if (error.code === "P1003" || error.message?.includes("does not exist")) {
  //         this.logger.error(
  //           `[Tenant ${cacheKey}] Database does not exist. Verify database name in connection string.`,
  //         );
  //       }

  //       if (attempt < maxRetries) {
  //         // Wait before retry (exponential backoff)
  //         const waitTime = 1000 * attempt;
  //         this.logger.warn(`[Tenant ${cacheKey}] Retrying in ${waitTime}ms...`);
  //         await new Promise((resolve) => setTimeout(resolve, waitTime));
  //       } else {
  //         // All retries failed - provide detailed error
  //         this.logger.error(
  //           `❌ Failed to connect to tenant database ${cacheKey} after ${maxRetries} attempts`,
  //         );
  //         this.logger.error(`Final error: ${error.message}`);
  //         this.logger.error(`Error code: ${error.code || "N/A"}`);
  //         this.logger.error(`Connection URL: ${databaseUrl.replace(/:[^:@]+@/, ":****@")}`);

  //         await client.$disconnect().catch(() => {});

  //         // Provide user-friendly error message
  //         let userMessage = `Failed to connect to tenant database. `;
  //         if (error.code === "P1001" || error.message?.includes("Can't reach database server")) {
  //           userMessage += `Database server is not reachable at the configured address. `;
  //           userMessage += `Please verify PostgreSQL is running and accessible.`;
  //         } else if (error.code === "P1000") {
  //           userMessage += `Authentication failed. Please check database credentials.`;
  //         } else if (error.code === "P1003") {
  //           userMessage += `Database does not exist. Please verify the database name.`;
  //         } else {
  //           userMessage += error.message || "Unknown connection error.";
  //         }

  //         throw new BadRequestException(userMessage);
  //       }
  //     }
  //   }

  //   // Cache the client
  //   this.tenantClients.set(cacheKey, client);
  //   this.clientLastUsed.set(cacheKey, Date.now());
  //   await this.evictClientsIfNeeded();

  //   return client;
  // }

  async getTenantClient(tenantId: string): Promise<PrismaClient> {
    if (!tenantId) {
      throw new BadRequestException("Invalid tenant ID");
    }

    const tenant = await this.tenantLifecycle.getActiveOrThrow(tenantId);
    return this.getOrCreateClient(tenant.schemaName);
  }

  /**
   * Disconnect a specific tenant's Prisma client
   * @param tenantId - The tenant ID
   */
  async disconnectTenant(tenantId: string): Promise<void> {
    let cacheKey = tenantId;
    let client = this.tenantClients.get(cacheKey);

    if (!client) {
      const resolvedTenantId = await this.tenantResolver.resolveToId(tenantId);
      if (resolvedTenantId) {
        cacheKey = resolvedTenantId;
        client = this.tenantClients.get(cacheKey);
      }
    }

    if (!client) {
      return;
    }

    try {
      await client.$disconnect();
      this.logger.log(
        `Disconnected tenant: ${cacheKey}${tenantId !== cacheKey ? ` (resolved from ${tenantId})` : ""}`,
      );
    } catch (error: any) {
      this.logger.error(`Error disconnecting tenant ${cacheKey}: ${error.message}`);
    } finally {
      this.tenantClients.delete(cacheKey);
      this.tenantStatusCache.delete(cacheKey);
      this.clientLastUsed.delete(cacheKey);
    }
  }

  /**
   * Disconnect all tenant clients
   */
  async disconnectAll(): Promise<void> {
    this.logger.log("Disconnecting all tenant clients...");
    const disconnectPromises = Array.from(this.tenantClients.keys()).map((tenantId) =>
      this.disconnectTenant(tenantId),
    );
    await Promise.all(disconnectPromises);
    this.logger.log("All tenant clients disconnected");
  }

  /**
   * Get tenant status (with caching)
   * @param tenantId - The tenant ID
   * @returns Tenant status
   */
  private async getTenantStatus(tenantId: string): Promise<{ status: TenantStatus }> {
    // Check cache first
    if (this.tenantStatusCache.has(tenantId)) {
      return this.tenantStatusCache.get(tenantId)!;
    }

    // Fetch from database
    const tenant = await this.masterPrisma.tenant.findUnique({ where: { id: tenantId } });

    if (!tenant) {
      throw new NotFoundException(`Tenant not found: ${tenantId}`);
    }

    // Update cache
    this.tenantStatusCache.set(tenantId, { status: tenant.status });

    return { status: tenant.status };
  }

  /**
   * Refresh tenant status cache
   * Call this when tenant status changes (e.g., suspension)
   * @param tenantId - The tenant ID
   */
  async refreshTenantStatus(tenantId: string): Promise<void> {
    const canonicalTenantId = await this.tenantResolver.resolveToId(tenantId);

    if (!canonicalTenantId) {
      return;
    }

    this.tenantStatusCache.delete(canonicalTenantId);
    this.tenantLifecycle.invalidate(canonicalTenantId);

    // If tenant is suspended/inactive, disconnect
    const { status } = await this.getTenantStatus(canonicalTenantId);
    if (status !== TenantStatus.ACTIVE) {
      await this.disconnectTenant(canonicalTenantId);
    }
  }

  /**
   * Get list of connected tenant IDs
   * @returns Array of tenant IDs
   */
  getConnectedTenants(): string[] {
    return Array.from(this.tenantClients.keys());
  }

  /**
   * Check if a tenant is connected
   * @param tenantId - The tenant ID
   * @returns True if connected
   */
  isTenantConnected(tenantId: string): boolean {
    return this.tenantClients.has(tenantId);
  }

  getConnectionStats() {
    return {
      connectedClients: this.tenantClients.size,
      maxClients: this.maxClients,
      idleTtlMs: this.idleTtlMs,
      cleanupIntervalMs: this.cleanupIntervalMs,
      tenants: Array.from(this.tenantClients.keys()),
    };
  }

  /**
   * Cleanup on module destroy
   */
  // async onModuleDestroy() {
  //   clearInterval(this.cleanupTimer);
  //   await this.disconnectAll();
  // }

  private async evictClientsIfNeeded(): Promise<void> {
    const connected = this.tenantClients.size;
    if (connected <= this.maxClients) {
      return;
    }

    const entries = Array.from(this.clientLastUsed.entries()).sort((a, b) => a[1] - b[1]);
    const toEvict = connected - this.maxClients;
    const candidateIds = entries.slice(0, toEvict).map(([tenantId]) => tenantId);

    for (const tenantId of candidateIds) {
      await this.disconnectTenant(tenantId);
      this.logger.warn(`Evicted Prisma client for tenant ${tenantId} due to max-client limit`);
    }
  }

  private async cleanupIdleClients(): Promise<void> {
    const now = Date.now();
    const idleTenantIds = Array.from(this.clientLastUsed.entries())
      .filter(([, lastUsed]) => now - lastUsed > this.idleTtlMs)
      .map(([tenantId]) => tenantId);

    for (const tenantId of idleTenantIds) {
      await this.disconnectTenant(tenantId);
      this.logger.debug(`Disconnected idle Prisma client for tenant ${tenantId}`);
    }
  }

  /////////////////////////

  // ─────────────────────────────────────────────────────────────────────────
  // THE ONLY METHOD YOU NEED TO CALL FROM OUTSIDE THIS SERVICE
  // Pass tenantId → get back a Prisma client scoped to that tenant's schema
  // ─────────────────────────────────────────────────────────────────────────
  async getClient(shortTenantId: string): Promise<{ client: PrismaClient; tenantId: string }> {
    const tenant = await this.tenantLifecycle.getActiveOrThrow(shortTenantId);
    const client = await this.getOrCreateClient(tenant.schemaName);
    return { client, tenantId: tenant.id };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ONLY USED INTERNALLY + by provisioning service right after schema creation
  // ─────────────────────────────────────────────────────────────────────────
  async getOrCreateClient(schemaName: string): Promise<PrismaClient> {
    const cached = this.tenantClients.get(schemaName);
    if (cached) {
      this.clientLastUsed.set(schemaName, Date.now());
      return cached;
    }

    const client = await this.buildClient(schemaName);
    this.tenantClients.set(schemaName, client);
    this.clientLastUsed.set(schemaName, Date.now());
    await this.evictClientsIfNeeded();

    return client;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE — builds a new connected PrismaClient scoped to the given schema
  //
  // WHY ?options=-c search_path= and NOT ?schema= ?
  //
  // ?schema=    → only used by Prisma CLI (migrate deploy, db push)
  //               Prisma IGNORES this at runtime. Your queries hit public.*
  //
  // ?options=-c search_path=   → actual PostgreSQL connection option
  //               Sets search_path on the connection. Prisma respects this
  //               at runtime. Your queries hit tenant_xyz.*  ✓
  // ─────────────────────────────────────────────────────────────────────────
  private async buildClient(schemaName: string): Promise<PrismaClient> {
    const rawBase = process.env.DATABASE_URL;
    if (!rawBase) throw new Error("DATABASE_URL is not defined");

    // Prisma always generates schema-qualified SQL ("public"."table").
    // Schema-per-tenant won't work — we must point each tenant at its own DATABASE.
    // schemaName (e.g. "tenant_6216") doubles as the database name.
    const connectionLimit = Number(process.env.TENANT_PRISMA_CONNECTION_LIMIT || 5);
    const url = withPostgresDatabaseName(rawBase, schemaName, {
      schema: "public",
      connection_limit: String(connectionLimit),
    });

    const client = new PrismaClient({
      datasources: { db: { url } },
      log: ["error"],
    });

    await client.$connect();
    this.logger.log(`Connected Prisma client for database: ${schemaName}`);
    return client;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Graceful shutdown — disconnect all clients when app stops
  // ─────────────────────────────────────────────────────────────────────────
  async onModuleDestroy() {
    for (const [schema, client] of this.tenantClients.entries()) {
      await client.$disconnect().catch(() => {});
      this.logger.log(`Disconnected client for schema: ${schema}`);
    }
    this.tenantClients.clear();
  }

  // Also useful when you already have the schemaName (e.g. during provisioning)

  // ─── Called when a tenant is suspended/deactivated ────────────────────────
  // Invalidates cached client so suspended tenants can't keep using old connections.

  // async onModuleDestroy() {
  //   clearInterval(this.cleanupTimer);
  //   await Promise.all([...this.tenantClients.keys()].map((s) => this.evictClient(s)));
  // }
}
