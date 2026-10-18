import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuditModule } from "@prisma/tenant-client";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { Auditable } from "../../audit/decorators/auditable.decorator";
import { RequestWithUser } from "../../common/interfaces";
import { CreateProductAdjustmentDto } from "./dto/create-product-adjustment.dto";
import { ProductAdjustmentFiltersDto } from "./dto/product-adjustment-filters.dto";
import { ProductAdjustmentsService } from "./product-adjustments.service";

@ApiTags("Customer Management - Product Adjustments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("customer-management/product-adjustments")
export class ProductAdjustmentsController {
  constructor(private readonly productAdjustmentsService: ProductAdjustmentsService) {}

  @Get()
  @RequirePermission("product-adjustment.view")
  @ApiOperation({ summary: "List shop product adjustments with pagination and filters" })
  listProductAdjustments(@Query() productAdjustmentFiltersDto: ProductAdjustmentFiltersDto) {
    return this.productAdjustmentsService.listProductAdjustments(productAdjustmentFiltersDto);
  }

  @Get(":adjustmentId")
  @RequirePermission("product-adjustment.view")
  @ApiOperation({ summary: "Get a shop product adjustment by ID" })
  getProductAdjustment(@Param("adjustmentId", ParseUUIDPipe) adjustmentId: string) {
    return this.productAdjustmentsService.getProductAdjustment(adjustmentId);
  }

  @Auditable({ module: AuditModule.CUSTOMER_PRODUCT_ADJUSTMENTS })
  @Post()
  @RequirePermission("product-adjustment.create")
  @ApiOperation({
    summary:
      "Record a shop product quantity adjustment (audit document only — does not change stock or ledger)",
  })
  createProductAdjustment(
    @Body() createProductAdjustmentDto: CreateProductAdjustmentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.productAdjustmentsService.createProductAdjustment(createProductAdjustmentDto, req);
  }
}
