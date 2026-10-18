import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { ProductBonusGroupModule } from "../product-bonus-groups/product-bonus-group.module";
import { ProductBonusSchemeRepository } from "./product-bonus-scheme.repository";
import { ProductBonusSchemeService } from "./product-bonus-scheme.service";
import { ProductBonusSchemeController } from "./product-bonus-scheme.controller";

@Module({
  imports: [AuditModule, UsersModule, ProductBonusGroupModule],
  providers: [ProductBonusSchemeRepository, ProductBonusSchemeService],
  controllers: [ProductBonusSchemeController],
  exports: [ProductBonusSchemeService],
})
export class ProductBonusSchemeModule {}
