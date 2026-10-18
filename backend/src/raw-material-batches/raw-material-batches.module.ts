import { Module } from "@nestjs/common";
import { RawMaterialBatchesService } from "./raw-material-batches.service";
import { RawMaterialBatchesController } from "./raw-material-batches.controller";
import { RawMaterialBatchesRepository } from "./raw-material-batches.repository";
import { AuditModule } from "../audit/audit.module";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [AuditModule, UsersModule],
  controllers: [RawMaterialBatchesController],
  providers: [RawMaterialBatchesService, RawMaterialBatchesRepository],
  exports: [RawMaterialBatchesService, RawMaterialBatchesRepository],
})
export class RawMaterialBatchesModule {}
