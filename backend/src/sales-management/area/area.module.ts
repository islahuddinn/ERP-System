import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { BranchModule } from "../branch/branch.module";
import { AreaRepository } from "./area.repository";
import { AreaService } from "./area.service";
import { AreaController } from "./area.controller";

@Module({
  imports: [AuditModule, UsersModule, BranchModule],
  providers: [AreaRepository, AreaService],
  controllers: [AreaController],
  exports: [AreaService],
})
export class AreaModule {}
