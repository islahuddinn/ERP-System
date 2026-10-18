import { Module } from "@nestjs/common";
import { AuditModule } from "../../audit/audit.module";
import { UsersModule } from "../../users/users.module";
import { CustomersModule } from "../customers/customers.module";
import { ProductAdjustmentsRepository } from "./product-adjustments.repository";
import { ProductAdjustmentsService } from "./product-adjustments.service";
import { ProductAdjustmentsController } from "./product-adjustments.controller";

@Module({
  imports: [AuditModule, UsersModule, CustomersModule],
  providers: [ProductAdjustmentsRepository, ProductAdjustmentsService],
  controllers: [ProductAdjustmentsController],
  exports: [ProductAdjustmentsService],
})
export class ProductAdjustmentsModule {}
