import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { ZoneModule } from "../zone/zone.module";
import { CityRepository } from "./city.repository";
import { CityService } from "./city.service";
import { CityController } from "./city.controller";

@Module({
  imports: [AuditModule, UsersModule, ZoneModule],
  providers: [CityRepository, CityService],
  controllers: [CityController],
  exports: [CityService],
})
export class CityModule {}
