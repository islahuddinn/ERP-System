import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { ProductsModule } from "../../product-management/products/products.module";
import { PriceListsRepository } from "./price-lists.repository";
import { PriceListsService } from "./price-lists.service";
import { PriceListsController } from "./price-lists.controller";

@Module({
  imports: [AuditModule, UsersModule, ProductsModule],
  providers: [PriceListsRepository, PriceListsService],
  controllers: [PriceListsController],
  exports: [PriceListsService],
})
export class PriceListsModule {}
