import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from "@nestjs/swagger";
import { MaterialTransfersService } from "./material-transfers.service";
import {
  CreateMaterialTransferDto,
  UpdateMaterialTransferDto,
  MaterialTransferQueryDto,
} from "./dto/material-transfer.dto";
import { MaterialTransferStatus } from "./dto/material-transfer.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient, AuditModule } from "@prisma/tenant-client";
import { Auditable } from "../audit/decorators/auditable.decorator";

@ApiTags("Material Transfers")
@Controller("material-transfers")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class MaterialTransfersController {
  constructor(private readonly materialTransfersService: MaterialTransfersService) {}

  @Auditable({ module: AuditModule.MATERIAL_TRANSFERS })
  @Post()
  @RequirePermission("stock.transfer")
  @ApiOperation({ summary: "Create a new material transfer" })
  @ApiResponse({
    status: 201,
    description: "Material transfer created successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({
    status: 404,
    description: "Source or destination location not found",
  })
  create(
    @TenantClient() tenantClient: PrismaClient,
    @Body() createMaterialTransferDto: CreateMaterialTransferDto,
    @Request() req,
  ) {
    return this.materialTransfersService.create(
      tenantClient,
      createMaterialTransferDto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Get()
  @RequirePermission("stock.transfer")
  @ApiOperation({ summary: "Get all material transfers" })
  @ApiResponse({
    status: 200,
    description: "Material transfers retrieved successfully",
  })
  @ApiQuery({ name: "status", required: false, enum: MaterialTransferStatus })
  @ApiQuery({ name: "transferType", required: false, type: String })
  @ApiQuery({ name: "sourceLocationType", required: false, type: String })
  @ApiQuery({ name: "sourceLocationId", required: false, type: String })
  @ApiQuery({ name: "destinationLocationType", required: false, type: String })
  @ApiQuery({ name: "destinationLocationId", required: false, type: String })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: String })
  @ApiQuery({ name: "limit", required: false, type: String })
  findAll(@Query() query: MaterialTransferQueryDto, @Request() req) {
    return this.materialTransfersService.findAll(req.user.tenantId, query);
  }

  @Get("stats")
  @RequirePermission("stock.transfer")
  @ApiOperation({ summary: "Get material transfer statistics" })
  @ApiResponse({
    status: 200,
    description: "Material transfer statistics retrieved successfully",
  })
  @ApiQuery({ name: "locationType", required: false, type: String })
  @ApiQuery({ name: "locationId", required: false, type: String })
  getStats(
    @Request() req,
    @Query("locationType") locationType?: string,
    @Query("locationId") locationId?: string,
  ) {
    return this.materialTransfersService.getMaterialTransferStats(
      req.user.tenantId,
      locationType,
      locationId,
    );
  }

  @Get("active/:locationType/:locationId")
  @RequirePermission("stock.transfer")
  @ApiOperation({ summary: "Get active transfers by location" })
  @ApiResponse({
    status: 200,
    description: "Active transfers retrieved successfully",
  })
  @ApiParam({ name: "locationType", type: String })
  @ApiParam({ name: "locationId", type: String })
  getActiveTransfersByLocation(
    @Param("locationType") locationType: string,
    @Param("locationId") locationId: string,
    @Request() req,
  ) {
    return this.materialTransfersService.getActiveTransfersByLocation(
      req.user.tenantId,
      locationType,
      locationId,
    );
  }

  @Get(":id")
  @RequirePermission("stock.transfer")
  @ApiOperation({ summary: "Get a material transfer by ID" })
  @ApiResponse({
    status: 200,
    description: "Material transfer retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Material transfer not found" })
  @ApiParam({ name: "id", type: String })
  findOne(@Param("id") id: string, @Request() req) {
    return this.materialTransfersService.findOne(id, req.user.tenantId);
  }

  @Auditable({ module: AuditModule.MATERIAL_TRANSFERS })
  @Patch(":id")
  @RequirePermission("stock.transfer")
  @ApiOperation({ summary: "Update a material transfer" })
  @ApiResponse({
    status: 200,
    description: "Material transfer updated successfully",
  })
  @ApiResponse({ status: 404, description: "Material transfer not found" })
  @ApiResponse({ status: 400, description: "Invalid status transition" })
  @ApiParam({ name: "id", type: String })
  update(
    @Param("id") id: string,
    @TenantClient() tenantClient: PrismaClient,
    @Body() updateMaterialTransferDto: UpdateMaterialTransferDto,
    @Request() req,
  ) {
    return this.materialTransfersService.update(
      tenantClient,
      id,
      updateMaterialTransferDto,
      req.user.tenantId,
      req.user.id,
    );
  }

  @Auditable({ module: AuditModule.MATERIAL_TRANSFERS })
  @Patch(":id/approve")
  @RequirePermission("stock.transfer")
  @ApiOperation({ summary: "Approve a material transfer" })
  @ApiResponse({
    status: 200,
    description: "Material transfer approved successfully",
  })
  @ApiResponse({ status: 404, description: "Material transfer not found" })
  @ApiResponse({ status: 400, description: "Cannot approve material transfer" })
  @ApiParam({ name: "id", type: String })
  approve(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body("comments") comments: string,
    @Request() req,
  ) {
    return this.materialTransfersService.approveTransfer(
      tenantClient,
      id,
      req.user.id,
      comments,
      req.user.tenantId,
    );
  }

  @Auditable({ module: AuditModule.MATERIAL_TRANSFERS })
  @Patch(":id/start")
  @RequirePermission("stock.transfer")
  @ApiOperation({ summary: "Start material transfer" })
  @ApiResponse({
    status: 200,
    description: "Material transfer started successfully",
  })
  @ApiResponse({ status: 404, description: "Material transfer not found" })
  @ApiResponse({ status: 400, description: "Cannot start material transfer" })
  @ApiParam({ name: "id", type: String })
  startTransfer(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body("transportDetails") transportDetails: string,
    @Request() req,
  ) {
    return this.materialTransfersService.startTransfer(
      tenantClient,
      id,
      req.user.id,
      transportDetails,
      req.user.tenantId,
    );
  }

  @Auditable({ module: AuditModule.MATERIAL_TRANSFERS })
  @Patch(":id/receive")
  @RequirePermission("stock.transfer")
  @ApiOperation({ summary: "Receive material transfer" })
  @ApiResponse({
    status: 200,
    description: "Material transfer received successfully",
  })
  @ApiResponse({ status: 404, description: "Material transfer not found" })
  @ApiResponse({ status: 400, description: "Cannot receive material transfer" })
  @ApiParam({ name: "id", type: String })
  receiveTransfer(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body("receivingComments") receivingComments: string,
    @Body("items") items: any[],
    @Request() req,
  ) {
    return this.materialTransfersService.receiveTransfer(
      tenantClient,
      id,
      req.user.id,
      receivingComments,
      items,
      req.user.tenantId,
    );
  }

  @Auditable({ module: AuditModule.MATERIAL_TRANSFERS })
  @Patch(":id/cancel")
  @RequirePermission("stock.transfer")
  @ApiOperation({ summary: "Cancel a material transfer" })
  @ApiResponse({
    status: 200,
    description: "Material transfer cancelled successfully",
  })
  @ApiResponse({ status: 404, description: "Material transfer not found" })
  @ApiResponse({ status: 400, description: "Cannot cancel material transfer" })
  @ApiParam({ name: "id", type: String })
  cancelTransfer(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body("comments") comments: string,
    @Request() req,
  ) {
    return this.materialTransfersService.cancelTransfer(
      tenantClient,
      id,
      req.user.id,
      comments,
      req.user.tenantId,
    );
  }

  @Auditable({ module: AuditModule.MATERIAL_TRANSFERS })
  @Patch(":id/status")
  @RequirePermission("stock.transfer")
  @ApiOperation({ summary: "Update material transfer status" })
  @ApiResponse({
    status: 200,
    description: "Material transfer status updated successfully",
  })
  @ApiResponse({ status: 404, description: "Material transfer not found" })
  @ApiResponse({ status: 400, description: "Invalid status transition" })
  @ApiParam({ name: "id", type: String })
  updateStatus(
    @Param("id") id: string,
    @TenantClient() tenantClient: PrismaClient,
    @Body("status") status: MaterialTransferStatus,
    @Request() req,
  ) {
    return this.materialTransfersService.update(
      tenantClient,
      id,
      { status },
      req.user.tenantId,
      req.user.id,
    );
  }

  @Auditable({ module: AuditModule.MATERIAL_TRANSFERS })
  @Delete(":id")
  @RequirePermission("stock.transfer")
  @ApiOperation({ summary: "Delete a material transfer" })
  @ApiResponse({
    status: 200,
    description: "Material transfer deleted successfully",
  })
  @ApiResponse({ status: 404, description: "Material transfer not found" })
  @ApiResponse({ status: 400, description: "Cannot delete material transfer" })
  @ApiParam({ name: "id", type: String })
  remove(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string, @Request() req) {
    return this.materialTransfersService.remove(tenantClient, id, req.user.tenantId, req.user.id);
  }

  @Get("diagnostics/stock-check")
  @RequirePermission("stock.transfer")
  @ApiOperation({ summary: "Check stock availability for diagnostic purposes" })
  @ApiQuery({ name: "productId", type: String, required: true })
  @ApiQuery({ name: "warehouseId", type: String, required: true })
  @ApiQuery({ name: "requiredQuantity", type: Number, required: true })
  async checkStockDiagnostics(
    @TenantClient() tenantClient: PrismaClient,
    @Query("productId") productId: string,
    @Query("warehouseId") warehouseId: string,
    @Query("requiredQuantity") requiredQuantity: string,
    @Request() req,
  ) {
    return this.materialTransfersService.checkStockDiagnostics(
      tenantClient,
      productId,
      warehouseId,
      parseFloat(requiredQuantity),
      req.user.tenantId,
    );
  }

  @Get("diagnostics/stock-by-warehouse")
  @RequirePermission("stock.transfer")
  @ApiOperation({
    summary: "Get stock availability for a product across all warehouses",
  })
  @ApiQuery({ name: "productId", type: String, required: true })
  async getStockByWarehouse(
    @TenantClient() tenantClient: PrismaClient,
    @Query("productId") productId: string,
    @Request() req,
  ) {
    return this.materialTransfersService.getStockByWarehouse(
      tenantClient,
      productId,
      req.user.tenantId,
    );
  }

  @Get("diagnostics/products-with-stock")
  @RequirePermission("stock.transfer")
  @ApiOperation({
    summary: "Get all products with stock availability by warehouse",
  })
  async getProductsWithStock(@TenantClient() tenantClient: PrismaClient, @Request() req) {
    return this.materialTransfersService.getProductsWithStock(tenantClient, req.user.tenantId);
  }
}
