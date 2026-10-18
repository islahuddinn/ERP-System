import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { ProductBrandRepository } from "./product-brand.repository";
import { ProductBrandService } from "./product-brand.service";
import { ProductBrandController } from "./product-brand.controller";

@Module({
  imports: [AuditModule, UsersModule],
  providers: [ProductBrandRepository, ProductBrandService],
  controllers: [ProductBrandController],
  exports: [ProductBrandService],
})
export class ProductBrandModule {}
