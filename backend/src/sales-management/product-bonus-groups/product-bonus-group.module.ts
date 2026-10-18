import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { ProductBonusGroupRepository } from "./product-bonus-group.repository";
import { ProductBonusGroupService } from "./product-bonus-group.service";
import { ProductBonusGroupController } from "./product-bonus-group.controller";

@Module({
  imports: [AuditModule, UsersModule],
  providers: [ProductBonusGroupRepository, ProductBonusGroupService],
  controllers: [ProductBonusGroupController],
  exports: [ProductBonusGroupService],
})
export class ProductBonusGroupModule {}
