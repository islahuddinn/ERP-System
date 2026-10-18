import { Module } from "@nestjs/common";
import { MachinesController } from "./machines.controller";
import { MachinesService } from "./machines.service";
import { MachinesRepository } from "./machines.repository";
import { AuthModule } from "../auth/auth.module";
import { AuditModule } from "../audit/audit.module";
import { MultiTenantPrismaModule } from "../prisma/multi-tenant-prisma.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [MultiTenantPrismaModule, AuthModule, AuditModule, UsersModule],
  controllers: [MachinesController],
  providers: [MachinesService, MachinesRepository],
  exports: [MachinesService],
})
export class MachinesModule {}
