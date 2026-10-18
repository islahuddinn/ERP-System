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
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { WarehousesService } from "./warehouses.service";
import { CreateWarehouseDto } from "./dto/create-warehouse.dto";
import { UpdateWarehouseDto } from "./dto/update-warehouse.dto";
import { WarehouseFiltersDto } from "./dto/warehouse-filters.dto";
import { UpdateCapacityDto } from "./dto/update-capacity.dto";
import { AssignManagerDto } from "./dto/assign-manager.dto";
import { TransferStockDto } from "./dto/transfer-stock.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { CurrentUser } from "../users/decorators/current-user.decorator";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient } from "@prisma/tenant-client";
import { WarehouseStatus } from "@prisma/tenant-client";
import { WarehouseStockService } from "./warehouse-stock.service";

@ApiTags("Warehouses")
@Controller("warehouses")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class WarehousesController {
  constructor(
    private readonly warehousesService: WarehousesService,
    private readonly warehouseStockService: WarehouseStockService,
  ) {}

  @Post()
  @RequirePermission("warehouses.create")
  @ApiOperation({ summary: "Create a new warehouse" })
  @ApiResponse({ status: 201, description: "Warehouse created successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({
    status: 409,
    description: "Warehouse with this code already exists",
  })
  create(
    @TenantClient() tenantClient: PrismaClient,
    @Body() createWarehouseDto: CreateWarehouseDto,
    @CurrentUser() user: any,
  ) {
    return this.warehousesService.create(tenantClient, createWarehouseDto, user.id);
  }

  @Get()
  @RequirePermission("warehouses.view")
  @ApiOperation({ summary: "Get all warehouses" })
  @ApiResponse({
    status: 200,
    description: "Warehouses retrieved successfully",
  })
  findAll(@TenantClient() tenantClient: PrismaClient, @Query() filters: WarehouseFiltersDto) {
    return this.warehousesService.findAll(tenantClient, filters);
  }

  @Get(":id")
  @RequirePermission("warehouses.view")
  @ApiOperation({ summary: "Get warehouse by ID" })
  @ApiResponse({ status: 200, description: "Warehouse retrieved successfully" })
  @ApiResponse({ status: 404, description: "Warehouse not found" })
  findOne(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.warehousesService.findOne(tenantClient, id);
  }

  @Patch(":id")
  @RequirePermission("warehouses.update")
  @ApiOperation({ summary: "Update warehouse" })
  @ApiResponse({ status: 200, description: "Warehouse updated successfully" })
  @ApiResponse({ status: 404, description: "Warehouse not found" })
  @ApiResponse({
    status: 409,
    description: "Warehouse with this code already exists",
  })
  update(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body() updateWarehouseDto: UpdateWarehouseDto,
    @CurrentUser() user: any,
  ) {
    return this.warehousesService.update(tenantClient, id, updateWarehouseDto, user.id);
  }

  @Delete(":id")
  @RequirePermission("warehouses.delete")
  @ApiOperation({ summary: "Delete warehouse" })
  @ApiResponse({ status: 200, description: "Warehouse deleted successfully" })
  @ApiResponse({ status: 404, description: "Warehouse not found" })
  @ApiResponse({
    status: 400,
    description: "Cannot delete warehouse with stock or zones",
  })
  remove(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.warehousesService.remove(tenantClient, id);
  }

  @Patch(":id/capacity")
  @RequirePermission("warehouses.update")
  @ApiOperation({ summary: "Update warehouse capacity" })
  @ApiResponse({ status: 200, description: "Capacity updated successfully" })
  @ApiResponse({ status: 404, description: "Warehouse not found" })
  updateCapacity(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body() updateCapacityDto: UpdateCapacityDto,
  ) {
    return this.warehousesService.updateCapacity(tenantClient, id, updateCapacityDto);
  }

  @Get(":id/capacity")
  @RequirePermission("warehouses.view")
  @ApiOperation({ summary: "Get warehouse capacity information" })
  @ApiResponse({
    status: 200,
    description: "Capacity information retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Warehouse not found" })
  getCapacityInfo(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.warehousesService.getCapacityInfo(tenantClient, id);
  }

  @Get(":id/alerts")
  @RequirePermission("warehouses.view")
  @ApiOperation({ summary: "Get warehouse capacity alerts" })
  @ApiResponse({ status: 200, description: "Alerts retrieved successfully" })
  @ApiResponse({ status: 404, description: "Warehouse not found" })
  getCapacityAlerts(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.warehousesService.checkCapacityAlerts(tenantClient, id);
  }

  @Patch(":id/manager")
  @RequirePermission("warehouses.update")
  @ApiOperation({ summary: "Assign manager to warehouse" })
  @ApiResponse({ status: 200, description: "Manager assigned successfully" })
  @ApiResponse({ status: 404, description: "Warehouse or user not found" })
  assignManager(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body() assignManagerDto: AssignManagerDto,
  ) {
    return this.warehousesService.assignManager(tenantClient, id, assignManagerDto.managerId);
  }

  @Delete(":id/manager")
  @RequirePermission("warehouses.update")
  @ApiOperation({ summary: "Remove manager from warehouse" })
  @ApiResponse({ status: 200, description: "Manager removed successfully" })
  @ApiResponse({ status: 404, description: "Warehouse not found" })
  removeManager(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.warehousesService.removeManager(tenantClient, id);
  }

  @Patch(":id/status")
  @RequirePermission("warehouses.update")
  @ApiOperation({ summary: "Update warehouse status" })
  @ApiResponse({ status: 200, description: "Status updated successfully" })
  @ApiResponse({ status: 404, description: "Warehouse not found" })
  updateStatus(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body() body: { status: WarehouseStatus },
  ) {
    return this.warehousesService.updateStatus(tenantClient, id, body.status);
  }

  @Get(":id/stats")
  @RequirePermission("warehouses.view")
  @ApiOperation({ summary: "Get warehouse statistics" })
  @ApiResponse({
    status: 200,
    description: "Statistics retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Warehouse not found" })
  getStats(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.warehousesService.getWarehouseStats(tenantClient, id);
  }

  @Get(":id/stock")
  @RequirePermission("warehouses.view")
  @ApiOperation({ summary: "Get warehouse stock summary" })
  @ApiResponse({
    status: 200,
    description: "Stock summary retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Warehouse not found" })
  getStockSummary(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.warehousesService.getStockSummary(tenantClient, id);
  }

  @Get("stock/summary")
  @RequirePermission("warehouses.view")
  @ApiOperation({ summary: "Get global warehouse stock summary" })
  @ApiResponse({
    status: 200,
    description: "Global stock summary retrieved successfully",
  })
  getGlobalStockSummary(@TenantClient() tenantClient: PrismaClient) {
    return this.warehousesService.getGlobalStockSummary(tenantClient);
  }

  @Get("stock/balances")
  @RequirePermission("warehouses.view")
  @ApiOperation({ summary: "Get warehouse stock balances (paginated)" })
  @ApiResponse({
    status: 200,
    description: "Warehouse stock balances retrieved successfully",
  })
  getWarehouseStockBalances(
    @TenantClient() tenantClient: PrismaClient,
    @Query("warehouseId") warehouseId?: string,
    @Query("zoneId") zoneId?: string,
    @Query("productId") productId?: string,
    @Query("search") search?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.warehousesService.getWarehouseStockBalances(tenantClient, {
      warehouseId,
      zoneId,
      productId,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get("stock/transactions")
  @RequirePermission("warehouses.view")
  @ApiOperation({ summary: "Get warehouse stock transactions" })
  @ApiResponse({
    status: 200,
    description: "Stock transactions retrieved successfully",
  })
  getStockTransactions(
    @TenantClient() tenantClient: PrismaClient,
    @Query("warehouseId") warehouseId?: string,
    @Query("zoneId") zoneId?: string,
    @Query("productId") productId?: string,
    @Query("transactionType") transactionType?: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.warehousesService.getStockTransactions(tenantClient, {
      warehouseId,
      zoneId,
      productId,
      transactionType,
      startDate,
      endDate,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Post("stock/adjust")
  @RequirePermission("warehouses.update")
  @ApiOperation({ summary: "Create or adjust a product balance in a warehouse" })
  adjustStock(
    @TenantClient() tenantClient: PrismaClient,
    @Body()
    body: {
      warehouseId: string;
      zoneId?: string;
      productId: string;
      batchId?: string;
      quantity: number;
      reservedQuantity?: number;
    },
  ) {
    return this.warehouseStockService.upsertWarehouseStockBalance(tenantClient, body);
  }

  @Post("stock/transfer")
  @RequirePermission("stock.transfer")
  @ApiOperation({ summary: "Transfer stock between warehouses/zones" })
  @ApiResponse({ status: 200, description: "Stock transferred successfully" })
  @ApiResponse({
    status: 400,
    description: "Bad request - validation failed or insufficient stock",
  })
  @ApiResponse({
    status: 404,
    description: "Warehouse, zone, or product not found",
  })
  transferStock(
    @TenantClient() tenantClient: PrismaClient,
    @Body() transferStockDto: TransferStockDto,
    @CurrentUser() user: any,
  ) {
    return this.warehousesService.transferStock(tenantClient, transferStockDto, user.id);
  }
}
