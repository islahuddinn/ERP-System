import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuditModule } from "@prisma/tenant-client";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { Auditable } from "../../audit/decorators/auditable.decorator";
import { RequestWithUser } from "../../common/interfaces";
import { BranchProductPricesService } from "./branch-product-prices.service";
import { UpsertBranchProductPriceDto } from "./dto/upsert-branch-product-price.dto";
import { BranchProductPriceFiltersDto } from "./dto/branch-product-price-filters.dto";

@ApiTags("Sales Management - Branch Product Prices")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("sales-management/branch-product-prices")
export class BranchProductPricesController {
  constructor(private readonly branchProductPricesService: BranchProductPricesService) {}

  @Get()
  @RequirePermission(
    "branch-product-price.view",
    "branch-stock-operations.view",
    "branch-stock-operations.manage",
  )
  @ApiOperation({
    summary:
      "List a seller's product price list — omit sellerBranchId for the Factory's list. Only the seller itself or its own buyer branch may view it",
  })
  listBranchProductPrices(
    @Query() branchProductPriceFiltersDto: BranchProductPriceFiltersDto,
    @Req() req: RequestWithUser,
  ) {
    return this.branchProductPricesService.listBranchProductPrices(
      branchProductPriceFiltersDto,
      req,
    );
  }

  @Auditable({ module: AuditModule.BRANCH_PRODUCT_PRICES })
  @Post("mine")
  @RequirePermission("branch-product-price.manage", "branch-stock-operations.manage")
  @ApiOperation({ summary: "Set my own branch's standard price for a product" })
  setMyPrice(
    @Body() upsertBranchProductPriceDto: UpsertBranchProductPriceDto,
    @Req() req: RequestWithUser,
  ) {
    return this.branchProductPricesService.setMyPrice(upsertBranchProductPriceDto, req);
  }

  @Auditable({ module: AuditModule.BRANCH_PRODUCT_PRICES })
  @Post("factory")
  @RequirePermission("branch-product-price.manage-factory")
  @ApiOperation({ summary: "Set the Factory's standard price for a product" })
  setFactoryPrice(@Body() upsertBranchProductPriceDto: UpsertBranchProductPriceDto) {
    return this.branchProductPricesService.setFactoryPrice(upsertBranchProductPriceDto);
  }
}
