import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AuditModule, AuditAction } from "@prisma/tenant-client";
import { SaleDispatchesService } from "./sale-dispatches.service";
import { SaleDispatchQueryDto } from "./dto/sale-dispatch-query.dto";
import { UpdateSaleDispatchDto } from "./dto/update-sale-dispatch.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { Auditable } from "../audit/decorators/auditable.decorator";
import { RequestWithUser } from "../common/interfaces";

@ApiTags("Sale Dispatches")
@Controller("sale-dispatches")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SaleDispatchesController {
  constructor(private readonly saleDispatchesService: SaleDispatchesService) {}

  @Post("generate/:saleId")
  @RequirePermission("sale-dispatches.create")
  @Auditable({ module: AuditModule.SALE_DISPATCHES })
  @ApiOperation({
    summary: "Auto-generate dispatches for a sale, grouped by site (FIFO batch allocation)",
  })
  generate(@Param("saleId") saleId: string, @Req() req: RequestWithUser) {
    return this.saleDispatchesService.generateDispatches(saleId, req);
  }

  @Get()
  @RequirePermission("sale-dispatches.read")
  @ApiOperation({ summary: "Get all sale dispatches with pagination and filters" })
  findAll(@Query() dto: SaleDispatchQueryDto) {
    return this.saleDispatchesService.findAll(dto);
  }

  @Get(":saleDispatchId")
  @RequirePermission("sale-dispatches.read")
  @ApiOperation({ summary: "Get a sale dispatch by ID with full item details" })
  findOne(@Param("saleDispatchId") saleDispatchId: string) {
    return this.saleDispatchesService.findOne(saleDispatchId);
  }

  @Patch(":saleDispatchId")
  @RequirePermission("sale-dispatches.update")
  @Auditable({ module: AuditModule.SALE_DISPATCHES, action: AuditAction.UPDATE })
  @ApiOperation({
    summary:
      "Update a dispatch — change officer/notes (DRAFT only) or status: DRAFT→APPROVED, APPROVED→DRAFT (reject), APPROVED→DELIVERED (deducts stock)",
  })
  update(
    @Param("saleDispatchId") saleDispatchId: string,
    @Body() dto: UpdateSaleDispatchDto,
    @Req() req: RequestWithUser,
  ) {
    return this.saleDispatchesService.update(saleDispatchId, dto, req);
  }
}
