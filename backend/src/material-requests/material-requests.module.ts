import { Module } from "@nestjs/common";
import { MaterialRequestsController } from "./material-requests.controller";
import { MaterialRequestsService } from "./material-requests.service";
import { MaterialRequestsRepository } from "./material-requests.repository";
import { MultiTenantPrismaModule } from "../prisma/multi-tenant-prisma.module";
import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { ProductionOrdersModule } from "../production-orders/production-orders.module";
import { CommonServicesModule } from "../common/services/common-services.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    MultiTenantPrismaModule,
    AuthModule,
    AuditModule,
    ProductionOrdersModule,
    CommonServicesModule,
    UsersModule,
  ],
  controllers: [MaterialRequestsController],
  providers: [MaterialRequestsService, MaterialRequestsRepository],
  exports: [MaterialRequestsService],
})
export class MaterialRequestsModule {}
