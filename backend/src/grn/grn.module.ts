import { Module } from "@nestjs/common";
import { GrnController } from "./grn.controller";
import { GrnService } from "./grn.service";
import { GrnRepository } from "./grn.repository";
import { PrismaModule } from "../prisma/prisma.module";
import { UsersModule } from "../users/users.module";
import { AuditModule } from "../audit/audit.module";
import { PurchaseOrderModule } from "../purchase-orders/purchase-order.module";
import { RawMaterialBatchesModule } from "../raw-material-batches/raw-material-batches.module";

@Module({
  imports: [PrismaModule, UsersModule, AuditModule, PurchaseOrderModule, RawMaterialBatchesModule],
  controllers: [GrnController],
  providers: [GrnService, GrnRepository],
  exports: [GrnService, GrnRepository],
})
export class GrnModule {}
