import {
  createParamDecorator,
  ExecutionContext,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { TenantRequest } from "../middleware/tenant-context.middleware";
import { PrismaClient } from "@prisma/tenant-client";

const logger = new Logger("TenantClientDecorator");

/**
 * Decorator to inject tenant Prisma client into controller methods
 *
 * Usage:
 * ```typescript
 * @Get()
 * async getProducts(@TenantClient() tenantClient: PrismaClient) {
 *   return tenantClient.product.findMany();
 * }
 * ```
 *
 * Or with tenant ID:
 * ```typescript
 * @Get()
 * async getProducts(
 *   @TenantClient() tenantClient: PrismaClient,
 *   @TenantId() tenantId: string
 * ) {
 *   // Use tenantClient and tenantId
 * }
 * ```
 */
export const TenantClient = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): PrismaClient | undefined => {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();

    // Minimal log for debugging, only if explicitly needed
    if (request?.tenantClient) {
      return request.tenantClient;
    }

    // Defensive check: only log and throw if really missing when needed
    if (!request?.tenantClient) {
      throw new BadRequestException(`Tenant client not found`);
    }

    return request.tenantClient;
  },
);

/**
 * Decorator to inject tenant ID into controller methods
 *
 * Usage:
 * ```typescript
 * @Get()
 * async getProducts(@TenantId() tenantId: string) {
 *   // Use tenantId
 * }
 * ```
 */
export const TenantId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();

    if (!request || !request.tenantId) {
      return undefined;
    }

    return request.tenantId;
  },
);

/**
 * Decorator to inject both tenant client and tenant ID
 *
 * Usage:
 * ```typescript
 * @Get()
 * async getProducts(@TenantContext() context: { client: PrismaClient, tenantId: string }) {
 *   return context.client.product.findMany();
 * }
 * ```
 */
export const TenantContext = createParamDecorator(
  (
    data: unknown,
    ctx: ExecutionContext,
  ): { client: PrismaClient; tenantId: string } | undefined => {
    const request = ctx.switchToHttp().getRequest<TenantRequest>();

    if (!request || !request.tenantClient || !request.tenantId) {
      return undefined;
    }

    return {
      client: request.tenantClient,
      tenantId: request.tenantId,
    };
  },
);
