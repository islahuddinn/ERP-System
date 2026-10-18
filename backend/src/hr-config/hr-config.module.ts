import { Module } from "@nestjs/common";
import { HrConfigController } from "./hr-config.controller";
import { HrConfigService } from "./hr-config.service";
import { MultiTenantPrismaModule } from "../prisma/multi-tenant-prisma.module";
import { CommonServicesModule } from "../common/services/common-services.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [MultiTenantPrismaModule, CommonServicesModule, UsersModule],
  controllers: [HrConfigController],
  providers: [HrConfigService],
  exports: [HrConfigService],
})
export class HrConfigModule {}


