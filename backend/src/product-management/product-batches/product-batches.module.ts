import { Module } from "@nestjs/common";
import { ProductBatchesService } from "./product-batches.service";
import { ProductBatchesController } from "./product-batches.controller";
import { ProductBatchesRepository } from "./product-batches.repository";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";

@Module({
  imports: [AuditModule, UsersModule],
  controllers: [ProductBatchesController],
  providers: [ProductBatchesService, ProductBatchesRepository],
  exports: [ProductBatchesService, ProductBatchesRepository],
})
export class ProductBatchesModule {}
