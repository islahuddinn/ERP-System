import { PrismaClient } from "@prisma/tenant-client";

export const tenantDb = new PrismaClient();

export type TenantDb = typeof tenantDb;
