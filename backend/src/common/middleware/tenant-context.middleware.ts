import {
  Injectable,
  NestMiddleware,
  Logger,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Request, Response, NextFunction } from "express";
import { JwtService } from "@nestjs/jwt";
import { MultiTenantPrismaService } from "../../prisma/multi-tenant-prisma.service";
import { TenantResolverService } from "../services/tenant-resolver.service";
import { TenantLifecycleService } from "../services/tenant-lifecycle.service";
import { PrismaClient } from "@prisma/tenant-client";
import { TenantPrismaContextService } from "../../prisma/tenant-prisma-context.service";
import { pickTenantIdentifier } from "../utils/pick-tenant-identifier";

/**
 * Extended Express Request interface to include tenant context
 */
export interface TenantRequest extends Request {
  tenantId?: string;
  tenantSchema?: string;
  tenantClient?: PrismaClient;

  user?: {
    id: string;
    email: string;
    roleId: string;
    tenantId?: string;
  };
}

/**
 * Middleware to identify tenant and attach tenant database client to request
 *
 * Tenant identification priority:
 * 1. X-Tenant-Id header (for API calls)
 * 2. JWT token payload (tenantId field - will be added in Phase 5)
 * 3. Subdomain (optional, for future use)
 *
 * Super admin routes are excluded from tenant context
 */
@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantContextMiddleware.name);

  // Routes that don't require tenant context (super admin routes)
  private readonly excludedPrefixes = [
    "/api/super-admin",
    "/super-admin",
    "/api/docs",
    "/api/health",
    "/api/auth",
    "/auth",
    "/api/public",
  ];

  constructor(
    private readonly multiTenantPrisma: MultiTenantPrismaService,
    private readonly jwtService: JwtService,
    private readonly tenantResolver: TenantResolverService,
    private readonly tenantLifecycle: TenantLifecycleService,
    private readonly tenantPrismaContext: TenantPrismaContextService,
  ) {}

  async use(req: TenantRequest, _res: Response, next: NextFunction): Promise<void> {
    const requestPath = (req.originalUrl || req.url || req.path || "").toLowerCase();

    // Prevent duplicate execution if middleware is registered multiple times
    if (req.tenantId && req.tenantClient) {
      this.logger.debug(`Tenant context already attached for path: ${requestPath}`);
      return next();
    }

    if (req.method === "OPTIONS") {
      return next();
    }

    // Skip tenant context for excluded paths
    if (this.isExcludedPath(requestPath)) {
      return next();
    }

    try {
      // Try to extract tenant ID from multiple sources
      const tenantId = await this.extractTenantId(req);

      if (!tenantId) {
        this.logger.warn(`Missing tenant context for path: ${requestPath}`);
        throw new UnauthorizedException(
          "Tenant context required. Provide tenant ID in X-Tenant-Id header or authenticate with tenant token.",
        );
      }

      // Get tenant client
      // await this.tenantLifecycle.validateOrThrow(tenantId);
      // const tenantClient = await this.multiTenantPrisma.getTenantClient(tenantId);

      // // Attach to request
      // req.tenantId = tenantId;
      // req.tenantClient = tenantClient;

      const tenant = await this.tenantLifecycle.getActiveOrThrow(tenantId);
      const tenantClient = await this.multiTenantPrisma.getOrCreateClient(tenant.schemaName);

      req.tenantId = tenant.id;
      req.tenantSchema = tenant.schemaName;
      req.tenantClient = tenantClient;

      this.logger.debug(`Tenant context attached: ${tenantId} for path: ${requestPath}`);

      return this.tenantPrismaContext.runWithTenantClient(tenantClient, () => next());
    } catch (error) {
      this.logger.error(`Tenant context error on ${requestPath}: ${error.message}`);

      if (error instanceof NotFoundException) {
        throw new NotFoundException("Tenant not found or inactive. Please verify the tenant ID.");
      }

      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException("Unable to resolve tenant context. Please try again.");
    }
  }

  /**
   * Check if path is excluded from tenant context
   */
  private isExcludedPath(path: string): boolean {
    const normalizedPath = path.toLowerCase();
    return this.excludedPrefixes.some((prefix) => normalizedPath.startsWith(prefix));
  }

  /**
   * Extract tenant ID from request
   * Priority when Bearer token is present: JWT tenantId (source of truth) > header.
   * Stale X-Tenant-Id in the browser must not override the signed-in tenant.
   * Without Bearer: X-Tenant-Id > subdomain (for unauthenticated or token-less calls).
   */
  private async extractTenantId(req: TenantRequest): Promise<string | null> {
    const jwtTenantId = await this.extractTenantIdFromJWT(req);
    const headerRaw = this.getHeaderTenantId(req);
    const headerTenantId = headerRaw ? await this.tenantResolver.resolveToId(headerRaw) : null;
    const authHeader = req.headers.authorization;
    const hasBearer = typeof authHeader === "string" && authHeader.startsWith("Bearer ");

    const picked = pickTenantIdentifier({
      hasBearer,
      jwtTenantId,
      headerTenantId,
    });

    if (picked.ignoredMismatchedHeader) {
      this.logger.warn(
        `Ignoring X-Tenant-Id (${headerRaw}) in favor of JWT tenant (${jwtTenantId})`,
      );
    }

    if (picked.tenantId) {
      return picked.tenantId;
    }

    const subdomainTenantId = await this.extractTenantIdFromSubdomain(req);
    if (subdomainTenantId) {
      this.logger.debug(`Tenant ID from subdomain: ${subdomainTenantId}`);
      return subdomainTenantId;
    }

    return null;
  }

  private getHeaderTenantId(req: TenantRequest): string | null {
    const headerValue = req.headers["x-tenant-id"];
    if (typeof headerValue === "string" && headerValue.trim() !== "") {
      return headerValue.trim();
    }
    if (Array.isArray(headerValue)) {
      const firstValid = headerValue.find((value) => value && value.trim() !== "");
      if (firstValid) {
        return firstValid.trim();
      }
    }
    return null;
  }

  /**
   * Extract tenant ID from JWT token
   * In Phase 5, JWT will include tenantId in payload
   */
  private async extractTenantIdFromJWT(req: TenantRequest): Promise<string | null> {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return null;
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Decode JWT (without verification for now, since we're just extracting)
      // In production, this should be verified, but for middleware we'll let guards handle verification
      try {
        const decoded = this.jwtService.decode(token) as any;

        // Check if token has tenantId (will be added in Phase 5)
        if (decoded && decoded.tenantId) {
          const resolvedFromToken = await this.tenantResolver.resolveToId(decoded.tenantId);
          if (resolvedFromToken) {
            return resolvedFromToken;
          }
        }

        // Also check if user object has tenantId (from passport strategy)
        if (req.user && (req.user as any).tenantId) {
          const resolvedFromRequestUser = await this.tenantResolver.resolveToId(
            (req.user as any).tenantId,
          );
          if (resolvedFromRequestUser) {
            return resolvedFromRequestUser;
          }
        }
      } catch (error) {
        // Token might be invalid, but that's okay - guards will handle it
        this.logger.debug(`Failed to decode JWT: ${error.message}`);
      }
    } catch (error) {
      this.logger.debug(`Error extracting tenant ID from JWT: ${error.message}`);
    }

    return null;
  }

  /**
   * Extract tenant ID from subdomain
   * Example: tenant1.yourdomain.com -> tenant1
   */
  private async extractTenantIdFromSubdomain(req: TenantRequest): Promise<string | null> {
    try {
      const host = req.get("host") || req.hostname;
      if (!host) {
        return null;
      }

      // Check if host contains subdomain
      // Format: subdomain.domain.com or subdomain.localhost:port
      const parts = host.split(".");

      // For localhost:port format, check if there's a subdomain prefix
      if (host.includes("localhost")) {
        // For localhost, we might use a different format
        // For now, skip subdomain extraction for localhost
        return null;
      }

      // If we have at least 3 parts (subdomain.domain.tld), extract subdomain
      if (parts.length >= 3) {
        const subdomain = parts[0];
        // Validate subdomain format (alphanumeric and hyphens)
        if (/^[a-z0-9-]+$/i.test(subdomain) && subdomain.length > 0) {
          return this.tenantResolver.resolveToId(subdomain);
        }
      }
    } catch (error) {
      this.logger.debug(`Error extracting tenant ID from subdomain: ${error.message}`);
    }

    return null;
  }
}
