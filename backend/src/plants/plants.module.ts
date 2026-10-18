import { Module } from "@nestjs/common";
import { PlantsController } from "./plants.controller";
import { PlantsService } from "./plants.service";
import { PlantsRepository } from "./plants.repository";
import { MultiTenantPrismaModule } from "../prisma/multi-tenant-prisma.module";
import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [MultiTenantPrismaModule, AuthModule, AuditModule, UsersModule],
  controllers: [PlantsController],
  providers: [PlantsService, PlantsRepository],
  exports: [PlantsService],
})
export class PlantsModule {}
