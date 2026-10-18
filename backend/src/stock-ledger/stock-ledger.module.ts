import { Module } from "@nestjs/common";
import { StockLedgerController } from "./stock-ledger.controller";
import { StockLedgerService } from "./stock-ledger.service";
import { CommonServicesModule } from "../common/services/common-services.module";

@Module({
  imports: [CommonServicesModule],
  controllers: [StockLedgerController],
  providers: [StockLedgerService],
  exports: [StockLedgerService],
})
export class StockLedgerModule {}
