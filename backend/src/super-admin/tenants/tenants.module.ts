import { Module } from "@nestjs/common";
import { TenantsService } from "./tenants.service";
import { TenantsController } from "./tenants.controller";
import { TenantProvisioningService } from "./tenant-provisioning.service";
import { TenantMigrationService } from "./tenant-migration.service";
import { TenantSeedService } from "./tenant-seed.service";
import { MasterPrismaModule } from "../../master-prisma/master-prisma.module";
import { MultiTenantPrismaModule } from "../../prisma/multi-tenant-prisma.module";
import { ShortIdService } from "../../common/services/short-id.service";
import { CloudinaryService } from "../../common/services/cloudinary.service";
import { UsersModule } from "../../users/users.module";
import { SuperAdminAuditModule } from "../audit/super-admin-audit.module";
import { TenantsRepository } from "./tenant-repository";

@Module({
  imports: [MasterPrismaModule, MultiTenantPrismaModule, UsersModule, SuperAdminAuditModule],
  controllers: [TenantsController],
  providers: [
    TenantsService,
    TenantProvisioningService,
    TenantMigrationService,
    TenantSeedService,
    ShortIdService,
    CloudinaryService,
    TenantsRepository,
  ],
  exports: [TenantsService, TenantProvisioningService, TenantsRepository],
})
export class TenantsModule {}
