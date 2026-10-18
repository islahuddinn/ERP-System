import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { DesignationRepository } from "./designation.repository";
import { DesignationService } from "./designation.service";
import { DesignationController } from "./designation.controller";

@Module({
  imports: [AuditModule, UsersModule],
  providers: [DesignationRepository, DesignationService],
  controllers: [DesignationController],
  exports: [DesignationService],
})
export class DesignationModule {}
