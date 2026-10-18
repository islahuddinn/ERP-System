import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { ProductGroupRepository } from "./product-group.repository";
import { ProductGroupService } from "./product-group.service";
import { ProductGroupController } from "./product-group.controller";

@Module({
  imports: [AuditModule, UsersModule],
  providers: [ProductGroupRepository, ProductGroupService],
  controllers: [ProductGroupController],
  exports: [ProductGroupService],
})
export class ProductGroupModule {}
