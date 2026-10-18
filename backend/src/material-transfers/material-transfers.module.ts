import { Module } from "@nestjs/common";
import { MaterialTransfersController } from "./material-transfers.controller";
import { MaterialTransfersService } from "./material-transfers.service";
import { MaterialTransfersRepository } from "./material-transfers.repository";
import { MultiTenantPrismaModule } from "../prisma/multi-tenant-prisma.module";
import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { MaterialRequestsModule } from "../material-requests/material-requests.module";
import { CommonServicesModule } from "../common/services/common-services.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    MultiTenantPrismaModule,
    AuthModule,
    AuditModule,
    MaterialRequestsModule,
    CommonServicesModule,
    UsersModule,
  ],
  controllers: [MaterialTransfersController],
  providers: [MaterialTransfersService, MaterialTransfersRepository],
  exports: [MaterialTransfersService],
})
export class MaterialTransfersModule {}
