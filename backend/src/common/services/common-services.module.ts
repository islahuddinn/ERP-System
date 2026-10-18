import { Module, Global } from "@nestjs/common";
import { CacheModule } from "@nestjs/cache-manager";
import { CacheService } from "./cache.service";
import { StockLedgerService } from "./stock-ledger.service";
import { FinancialEventService } from "./financial-event.service";
import { WarehouseValidationService } from "./warehouse-validation.service";
import { SalesStockEnforcementService } from "./sales-stock-enforcement.service";
import { CapacityService } from "./capacity.service";

@Global()
@Module({
  imports: [
    CacheModule.register({
      ttl: 300,
      max: 10000,
    }),
  ],
  providers: [
    CacheService,
    StockLedgerService,
    FinancialEventService,
    WarehouseValidationService,
    SalesStockEnforcementService,
    CapacityService,
  ],
  exports: [
    CacheService,
    CacheModule,
    StockLedgerService,
    FinancialEventService,
    WarehouseValidationService,
    SalesStockEnforcementService,
    CapacityService,
  ],
})
export class CommonServicesModule {}
