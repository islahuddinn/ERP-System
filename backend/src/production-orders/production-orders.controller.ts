import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuditModule } from "@prisma/tenant-client";
import { Auditable } from "../audit/decorators/auditable.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { RequestWithUser } from "../common/interfaces";
import { ProductionOrdersService } from "./production-orders.service";
import { ProductBatchesService } from "../product-management/product-batches/product-batches.service";
import {
  AddProductionOrderCostDto,
  AddProductionOrderWasteDto,
  CreateProductionOrderDto,
  ProductionOrderQueryDto,
  UpdateProductionOrderDto,
  UpdateProductionOrderStatusDto,
} from "./dto";

@ApiTags("Production Orders")
@Controller("production-orders")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ProductionOrdersController {
  constructor(
    private readonly productionOrdersService: ProductionOrdersService,
    private readonly productBatchesService: ProductBatchesService,
  ) {}

  @Post()
  @Auditable({ module: AuditModule.PRODUCTION_ORDERS })
  @ApiOperation({ summary: "Create a new production order with FIFO raw material reservation" })
  @RequirePermission("production-orders.create")
  create(@Body() createDto: CreateProductionOrderDto, @Req() req: RequestWithUser) {
    return this.productionOrdersService.create(createDto, req);
  }

  @Get()
  @ApiOperation({ summary: "Get all production orders with pagination and filters" })
  @RequirePermission("production-orders.read")
  findAll(@Query() productionOrderQueryDto: ProductionOrderQueryDto) {
    return this.productionOrdersService.findAll(productionOrderQueryDto);
  }

  @Get(":productionOrderId")
  @ApiOperation({ summary: "Get a production order by ID" })
  @RequirePermission("production-orders.read")
  findOne(@Param("productionOrderId") productionOrderId: string) {
    return this.productionOrdersService.findOne(productionOrderId);
  }

  @Get(":productionOrderId/batch")
  @ApiOperation({ summary: "Get the product batch created from a completed production order" })
  @RequirePermission("production-orders.read")
  getBatch(@Param("productionOrderId") productionOrderId: string) {
    return this.productBatchesService.findByProductionOrderId(productionOrderId);
  }

  @Patch(":productionOrderId")
  @Auditable({ module: AuditModule.PRODUCTION_ORDERS })
  @ApiOperation({ summary: "Update a DRAFT production order's site or notes" })
  @RequirePermission("production-orders.update")
  update(
    @Param("productionOrderId") productionOrderId: string,
    @Body() updateProductionOrderDto: UpdateProductionOrderDto,
  ) {
    return this.productionOrdersService.update(productionOrderId, updateProductionOrderDto);
  }

  @Patch(":productionOrderId/status")
  @Auditable({ module: AuditModule.PRODUCTION_ORDERS })
  @ApiOperation({
    summary:
      "Update production order status: CONFIRM (DRAFT→IN_PROGRESS), COMPLETE (IN_PROGRESS→COMPLETED), or CANCEL",
  })
  @RequirePermission("production-orders.update")
  updateStatus(
    @Param("productionOrderId") productionOrderId: string,
    @Body() dto: UpdateProductionOrderStatusDto,
    @Req() req: RequestWithUser,
  ) {
    return this.productionOrdersService.updateStatus(productionOrderId, dto, req);
  }

  @Post(":productionOrderId/costs")
  @Auditable({ module: AuditModule.PRODUCTION_ORDERS })
  @ApiOperation({
    summary: "Add an additional cost line (labour, overhead, etc.) to a production order",
  })
  @RequirePermission("production-orders.update")
  addCost(
    @Param("productionOrderId") productionOrderId: string,
    @Body() addCostDto: AddProductionOrderCostDto,
    @Req() req: RequestWithUser,
  ) {
    return this.productionOrdersService.addCost(productionOrderId, addCostDto, req);
  }

  @Post(":productionOrderId/wastes")
  @Auditable({ module: AuditModule.PRODUCTION_ORDERS })
  @ApiOperation({
    summary: "Add a reusable waste material consumed as input to a production order",
  })
  @RequirePermission("production-orders.update")
  addWaste(
    @Param("productionOrderId") productionOrderId: string,
    @Body() addWasteDto: AddProductionOrderWasteDto,
    @Req() req: RequestWithUser,
  ) {
    return this.productionOrdersService.addWaste(productionOrderId, addWasteDto, req);
  }
}
