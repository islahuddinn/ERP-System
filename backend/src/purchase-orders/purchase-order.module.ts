import { Module } from "@nestjs/common";
import { PurchaseOrderController } from "./purchase-order.controller";
import { PurchaseOrderService } from "./purchase-order.service";
import { PurchaseOrderRepository } from "./purchase-order.repository";
import { PurchaseReportsController } from "./reports.controller";
import { PurchaseReportsService } from "./reports.service";
import { PurchaseSummaryController } from "./summary.controller";
import { PurchaseSummaryService } from "./summary.service";
import { PurchaseReturnController } from "./purchase-return.controller";
import { PurchaseReturnService } from "./purchase-return.service";
import { PurchaseReturnRepository } from "./purchase-return.repository";
import { AuditModule } from "../audit/audit.module";
import { UsersModule } from "../users/users.module";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [AuditModule, UsersModule, PrismaModule],
  // Non-parameterized controllers registered BEFORE PurchaseOrderController
  // so routes like /purchases/reports resolve before /purchases/:purchaseOrderId
  controllers: [
    PurchaseReportsController,
    PurchaseSummaryController,
    PurchaseReturnController,
    PurchaseOrderController,
  ],
  providers: [
    PurchaseOrderService,
    PurchaseOrderRepository,
    PurchaseReportsService,
    PurchaseSummaryService,
    PurchaseReturnService,
    PurchaseReturnRepository,
  ],
  exports: [PurchaseOrderService, PurchaseOrderRepository],
})
export class PurchaseOrderModule {}
