import { Global, Module } from "@nestjs/common";
import { MultiTenantPrismaService } from "./multi-tenant-prisma.service";
import { EncryptionService } from "./encryption.service";
import { MasterPrismaModule } from "../master-prisma/master-prisma.module";

/**
 * Global module that provides multi-tenant Prisma client management
 * This module should be imported in AppModule to make it available throughout the application
 */
@Global()
@Module({
  imports: [MasterPrismaModule],
  providers: [EncryptionService, MultiTenantPrismaService],
  exports: [EncryptionService, MultiTenantPrismaService],
})
export class MultiTenantPrismaModule {}
