import { Injectable } from "@nestjs/common";
import { AsyncLocalStorage } from "async_hooks";
import { PrismaClient } from "@prisma/tenant-client";

@Injectable()
export class TenantPrismaContextService {
  private readonly storage = new AsyncLocalStorage<{ tenantClient?: PrismaClient }>();

  runWithTenantClient<T>(tenantClient: PrismaClient, fn: () => T): T {
    return this.storage.run({ tenantClient }, fn);
  }

  getTenantClient(): PrismaClient | undefined {
    return this.storage.getStore()?.tenantClient;
  }
}
