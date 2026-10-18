import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuditModule } from "@prisma/tenant-client";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { Auditable } from "../../audit/decorators/auditable.decorator";
import { PriceListsService } from "./price-lists.service";
import { UpsertPriceListEntryDto } from "./dto/upsert-price-list-entry.dto";
import { PriceListFiltersDto } from "./dto/price-list-filters.dto";
import { PriceListHistoryQueryDto } from "./dto/price-list-history-query.dto";

@ApiTags("Sales Management - Price Lists")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("sales-management/price-lists")
export class PriceListsController {
  constructor(private readonly priceListsService: PriceListsService) {}

  @Get()
  @RequirePermission("price-list.view")
  @ApiOperation({ summary: "List price lists grouped by product, with all 4 tiers per product" })
  listPriceListEntries(@Query() priceListFiltersDto: PriceListFiltersDto) {
    return this.priceListsService.listPriceListEntries(priceListFiltersDto);
  }

  @Get(":productId/history")
  @RequirePermission("price-list.view")
  @ApiOperation({ summary: "Price change history for one product, scoped to a single tier" })
  getProductPriceHistory(
    @Param("productId", ParseUUIDPipe) productId: string,
    @Query() priceListHistoryQueryDto: PriceListHistoryQueryDto,
  ) {
    return this.priceListsService.getProductPriceHistory(
      productId,
      priceListHistoryQueryDto.tier,
    );
  }

  @Auditable({ module: AuditModule.PRICE_LISTS })
  @Post()
  @RequirePermission("price-list.manage")
  @ApiOperation({ summary: "Set a product's price at one tier — Finance/Admin only" })
  upsertPriceListEntry(@Body() upsertPriceListEntryDto: UpsertPriceListEntryDto) {
    return this.priceListsService.upsertPriceListEntry(upsertPriceListEntryDto);
  }
}
