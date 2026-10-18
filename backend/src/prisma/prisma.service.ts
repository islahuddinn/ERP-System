import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { TenantPrismaContextService } from "./tenant-prisma-context.service";
import { PrismaClient } from "@prisma/tenant-client";

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly tenantPrismaContext: TenantPrismaContextService) {
    // ✅ Prisma 6.4.0 uses binary engine by default - no engine option needed
    // Validate DATABASE_URL is set
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not defined! Set it in Railway environment variables.");
    }

    // ✅ Prisma 6.x works with classic binary engine - simple configuration
    super({
      datasources: {
        db: { url: process.env.DATABASE_URL },
      },
    } as any);

    // Route Prisma model/query access to the current request tenant client when available.
    // This keeps existing service code (this.prisma.model.*) tenant-safe without large rewrites.
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        const tenantClient = this.tenantPrismaContext.getTenantClient();
        const fallback = Reflect.get(target, prop, receiver);

        if (!tenantClient) {
          return typeof fallback === "function" ? fallback.bind(target) : fallback;
        }

        const tenantValue = (tenantClient as any)[prop as any];
        if (tenantValue === undefined) {
          return typeof fallback === "function" ? fallback.bind(target) : fallback;
        }

        return typeof tenantValue === "function" ? tenantValue.bind(tenantClient) : tenantValue;
      },
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
