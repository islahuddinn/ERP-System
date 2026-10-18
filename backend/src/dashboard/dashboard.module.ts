import { Module } from "@nestjs/common";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { DashboardRepository } from "./dashboard.repository";
import { PrismaModule } from "../prisma/prisma.module";
import { CommonServicesModule } from "../common/services/common-services.module";
import { ProductsModule } from "../product-management/products/products.module";
import { RawMaterialsModule } from "../raw-materials/raw-materials.module";
import { PurchaseOrderModule } from "../purchase-orders/purchase-order.module";
import { SuppliersModule } from "../suppliers/suppliers.module";
import { ProductionOrdersModule } from "../production-orders/production-orders.module";
import { BomModule } from "../bom/bom.module";
import { GrnModule } from "../grn/grn.module";
import { CustomersModule } from "../customer-management/customers/customers.module";

@Module({
  imports: [
    PrismaModule,
    CommonServicesModule,
    ProductsModule,
    RawMaterialsModule,
    PurchaseOrderModule,
    SuppliersModule,
    ProductionOrdersModule,
    BomModule,
    GrnModule,
    CustomersModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService, DashboardRepository],
  exports: [DashboardService],
})
export class DashboardModule {}
