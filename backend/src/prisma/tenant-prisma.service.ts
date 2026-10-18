import { Injectable, Scope, BadRequestException } from "@nestjs/common";
import { PrismaClient } from "@prisma/tenant-client";

@Injectable({ scope: Scope.REQUEST })
export class TenantPrismaService {
  private tenantSchema?: string;

  constructor(private readonly prisma: PrismaClient) {}

  async setTenantSchema(schema: string) {
    // sanitize schema
    if (!/^[a-zA-Z0-9_]+$/.test(schema)) {
      throw new BadRequestException(`Invalid tenant schema`);
    }

    this.tenantSchema = schema;

    await this.prisma.$executeRawUnsafe(`SET search_path TO "${schema}"`);
  }

  getClient() {
    return this.prisma;
  }

  getSchema() {
    return this.tenantSchema;
  }
}
