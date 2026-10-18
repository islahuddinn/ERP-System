import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { PositionRepository } from "./position.repository";
import { PositionService } from "./position.service";
import { PositionController } from "./position.controller";

@Module({
  imports: [AuditModule, UsersModule],
  providers: [PositionRepository, PositionService],
  controllers: [PositionController],
  exports: [PositionService],
})
export class PositionModule {}
