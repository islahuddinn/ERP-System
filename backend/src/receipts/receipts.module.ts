import { Module } from "@nestjs/common";
import { ReceiptsService } from "./receipts.service";
import { ReceiptsController } from "./receipts.controller";
import { PosModule } from "../pos/pos.module";
import { MasterPrismaModule } from "../master-prisma/master-prisma.module";
import { InvoiceSettingsModule } from "../invoice-settings/invoice-settings.module";

@Module({
  imports: [PosModule, MasterPrismaModule, InvoiceSettingsModule],
  controllers: [ReceiptsController],
  providers: [ReceiptsService],
  exports: [ReceiptsService],
})
export class ReceiptsModule {}
