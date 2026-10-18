import { Global, Module } from "@nestjs/common";
import { MasterPrismaService } from "./master-prisma.service";
import { TenantResolverService } from "../common/services/tenant-resolver.service";
import { PasswordEncryptionService } from "../common/services/password-encryption.service";
import { CloudinaryService } from "../common/services/cloudinary.service";
import { TenantLifecycleService } from "../common/services/tenant-lifecycle.service";

@Global()
@Module({
  providers: [
    MasterPrismaService,
    TenantResolverService,
    TenantLifecycleService,
    PasswordEncryptionService,
    CloudinaryService,
  ],
  exports: [
    MasterPrismaService,
    TenantResolverService,
    TenantLifecycleService,
    PasswordEncryptionService,
    CloudinaryService,
  ],
})
export class MasterPrismaModule {}
