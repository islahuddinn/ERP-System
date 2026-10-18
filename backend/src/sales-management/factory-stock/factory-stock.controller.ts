import { Body, Controller, Get, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuditModule } from "@prisma/tenant-client";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { Auditable } from "../../audit/decorators/auditable.decorator";
import { FactoryStockService } from "./factory-stock.service";
import { FactoryStockFiltersDto } from "./dto/factory-stock-filters.dto";
import { StockInFactoryStockDto } from "./dto/stock-in-factory-stock.dto";
import { AdjustFactoryStockDto } from "./dto/adjust-factory-stock.dto";

@ApiTags("Sales Management - Factory Stock")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("sales-management/factory-stock")
export class FactoryStockController {
  constructor(private readonly factoryStockService: FactoryStockService) {}

  @Get()
  @RequirePermission("factory-stock.view", "factory-stock.manage")
  @ApiOperation({ summary: "List current factory stock balances, filterable by product" })
  listFactoryStock(@Query() factoryStockFiltersDto: FactoryStockFiltersDto) {
    return this.factoryStockService.listFactoryStock(factoryStockFiltersDto);
  }

  @Auditable({ module: AuditModule.FACTORY_STOCK })
  @Post("stock-in")
  @RequirePermission("factory-stock.manage")
  @ApiOperation({ summary: "Add stock to the Factory's pool for a product" })
  stockIn(@Body() stockInFactoryStockDto: StockInFactoryStockDto) {
    return this.factoryStockService.stockIn(stockInFactoryStockDto);
  }

  @Auditable({ module: AuditModule.FACTORY_STOCK })
  @Patch("adjust")
  @RequirePermission("factory-stock.manage")
  @ApiOperation({
    summary:
      "Apply a signed correction to a product's factory stock, e.g. wastage or a stock count fix",
  })
  adjust(@Body() adjustFactoryStockDto: AdjustFactoryStockDto) {
    return this.factoryStockService.adjust(adjustFactoryStockDto);
  }
}
