import { Module } from "@nestjs/common";
import { AuditModule } from "../audit/audit.module";
import { UsersModule } from "../users/users.module";
import { BomController } from "./bom.controller";
import { BomService } from "./bom.service";
import { BomRepository } from "./bom.repository";

@Module({
  imports: [AuditModule, UsersModule],
  controllers: [BomController],
  providers: [BomService, BomRepository],
  exports: [BomService, BomRepository],
})
export class BomModule {}
