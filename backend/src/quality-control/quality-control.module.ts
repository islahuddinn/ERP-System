import { Module } from "@nestjs/common";
import { QualityControlController } from "./quality-control.controller";
import { QualityControlService } from "./quality-control.service";
import { QualityControlRepository } from "./quality-control.repository";
import { PrismaModule } from "../prisma/prisma.module";
import { StockLedgerModule } from "../stock-ledger/stock-ledger.module";
import { CommonServicesModule } from "../common/services/common-services.module";

@Module({
  imports: [PrismaModule, StockLedgerModule, CommonServicesModule],
  controllers: [QualityControlController],
  providers: [QualityControlService, QualityControlRepository],
  exports: [QualityControlService],
})
export class QualityControlModule {}
