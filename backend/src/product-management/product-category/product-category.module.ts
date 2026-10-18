import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { ProductCategoryRepository } from "./product-category.repository";
import { ProductCategoryService } from "./product-category.service";
import { ProductCategoryController } from "./product-category.controller";

@Module({
  imports: [AuditModule, UsersModule],
  providers: [ProductCategoryRepository, ProductCategoryService],
  controllers: [ProductCategoryController],
  exports: [ProductCategoryService],
})
export class ProductCategoryModule {}
