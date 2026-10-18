import { Module } from "@nestjs/common";
import { WasteManagementController } from "./waste-management.controller";
import { WasteManagementService } from "./waste-management.service";
import { WasteManagementRepository } from "./waste-management.repository";
import { PrismaModule } from "../prisma/prisma.module";
import { UsersModule } from "../users/users.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [PrismaModule, UsersModule, AuditModule],
  controllers: [WasteManagementController],
  providers: [WasteManagementService, WasteManagementRepository],
  exports: [WasteManagementService],
})
export class WasteManagementModule {}
