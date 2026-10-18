import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { RegionModule } from "../region/region.module";
import { ZoneRepository } from "./zone.repository";
import { ZoneService } from "./zone.service";
import { ZoneController } from "./zone.controller";

@Module({
  imports: [AuditModule, UsersModule, RegionModule],
  providers: [ZoneRepository, ZoneService],
  controllers: [ZoneController],
  exports: [ZoneService],
})
export class ZoneModule {}
