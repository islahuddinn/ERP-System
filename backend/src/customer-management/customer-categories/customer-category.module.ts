import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { CustomerCategoryRepository } from "./customer-category.repository";
import { CustomerCategoryService } from "./customer-category.service";
import { CustomerCategoryController } from "./customer-category.controller";

@Module({
  imports: [AuditModule, UsersModule],
  providers: [CustomerCategoryRepository, CustomerCategoryService],
  controllers: [CustomerCategoryController],
  exports: [CustomerCategoryService],
})
export class CustomerCategoryModule {}
