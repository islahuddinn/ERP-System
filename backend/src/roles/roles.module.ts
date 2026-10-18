import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { UsersModule } from "../users/users.module";
import { CommonServicesModule } from "../common/services/common-services.module";
import { RolesRepository } from "./roles.repository";
import { RolesService } from "./roles.service";
import { RolesController } from "./roles.controller";

@Module({
  imports: [AuditModule, UsersModule, CommonServicesModule],
  providers: [RolesRepository, RolesService],
  controllers: [RolesController],
  exports: [RolesService],
})
export class RolesModule {}
