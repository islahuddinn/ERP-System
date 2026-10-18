import { Module } from "@nestjs/common";
import { WarehousesService } from "./warehouses.service";
import { WarehousesController } from "./warehouses.controller";
import { ZonesService } from "./zones/zones.service";
import { ZonesController } from "./zones/zones.controller";
import { ZonesDirectController } from "./zones/zones-direct.controller";
import { CapacityService } from "../common/services/capacity.service";
import { CapacityController } from "./capacity/capacity.controller";
import { WarehouseStockService } from "./warehouse-stock.service";
import { CapacitySchedulerService } from "./capacity/capacity-scheduler.service";
import { MasterPrismaModule } from "../master-prisma/master-prisma.module";
import { UsersModule } from "../users/users.module";
import { StockLedgerModule } from "../stock-ledger/stock-ledger.module";
import { CommonServicesModule } from "../common/services/common-services.module";

@Module({
  imports: [
    MasterPrismaModule,
    UsersModule,
    StockLedgerModule,
    CommonServicesModule,
  ],
  controllers: [
    WarehousesController,
    ZonesController,
    ZonesDirectController,
    CapacityController,
  ],
  providers: [
    WarehousesService,
    ZonesService,
    CapacityService,
    WarehouseStockService,
    CapacitySchedulerService,
  ],
  exports: [
    WarehousesService,
    ZonesService,
    CapacityService,
    WarehouseStockService,
  ],
})
export class WarehousesModule {}
