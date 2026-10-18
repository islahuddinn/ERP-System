import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { RegionRepository } from "./region.repository";
import { RegionService } from "./region.service";
import { RegionController } from "./region.controller";

@Module({
  imports: [AuditModule, UsersModule],
  providers: [RegionRepository, RegionService],
  controllers: [RegionController],
  exports: [RegionService],
})
export class RegionModule {}
