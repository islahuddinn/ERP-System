import { Module } from "@nestjs/common";
import { ProductionOrdersController } from "./production-orders.controller";
import { ProductionOrdersService } from "./production-orders.service";
import { ProductionOrdersRepository } from "./production-orders.repository";
import { AuditModule } from "../audit/audit.module";
import { UsersModule } from "../users/users.module";
import { ProductBatchesModule } from "../product-management/product-batches/product-batches.module";

@Module({
  imports: [AuditModule, UsersModule, ProductBatchesModule],
  controllers: [ProductionOrdersController],
  providers: [ProductionOrdersService, ProductionOrdersRepository],
  exports: [ProductionOrdersService, ProductionOrdersRepository],
})
export class ProductionOrdersModule {}
