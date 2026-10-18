import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { TenantPrismaContextService } from "./tenant-prisma-context.service";

@Global()
@Module({
  providers: [PrismaService, TenantPrismaContextService],
  exports: [PrismaService, TenantPrismaContextService],
})
export class PrismaModule {}
