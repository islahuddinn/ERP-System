import { Module } from "@nestjs/common";
import { ProductionLinesController } from "./production-lines.controller";
import { ProductionLinesService } from "./production-lines.service";
import { ProductionLinesRepository } from "./production-lines.repository";
import { MultiTenantPrismaModule } from "../prisma/multi-tenant-prisma.module";
import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [MultiTenantPrismaModule, AuthModule, AuditModule, UsersModule],
  controllers: [ProductionLinesController],
  providers: [ProductionLinesService, ProductionLinesRepository],
  exports: [ProductionLinesService],
})
export class ProductionLinesModule {}
