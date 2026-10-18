import { Module } from "@nestjs/common";
import { SuperAdminAuditService } from "./super-admin-audit.service";
import { MasterPrismaModule } from "../../master-prisma/master-prisma.module";
import { SuperAdminAuditController } from "./super-admin-audit.controller";

@Module({
  imports: [MasterPrismaModule],
  controllers: [SuperAdminAuditController],
  providers: [SuperAdminAuditService],
  exports: [SuperAdminAuditService],
})
export class SuperAdminAuditModule {}
