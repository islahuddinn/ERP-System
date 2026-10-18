import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { StockTransactionsService } from "./stock-transactions.service";
import { CreateStockTransactionDto } from "./dto/create-stock-transaction.dto";
import { BulkAdjustmentDto } from "./dto/bulk-adjustment.dto";
import { BulkTransferDto } from "./dto/bulk-transfer.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PaginationDto } from "../common/dto/pagination.dto";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient, AuditModule } from "@prisma/tenant-client";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { Auditable } from "../audit/decorators/auditable.decorator";

@ApiTags("Stock Transactions")
@Controller("stock/transactions")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class StockTransactionsController {
  constructor(private readonly stockTransactionsService: StockTransactionsService) {}

  @Auditable({ module: AuditModule.STOCK_TRANSACTIONS })
  @Post()
  @RequirePermission("stock.adjust")
  @ApiOperation({ summary: "Create a new stock transaction" })
  @ApiResponse({ status: 201, description: "Transaction created successfully" })
  @ApiResponse({ status: 400, description: "Bad request" })
  @ApiResponse({ status: 404, description: "Product or location not found" })
  create(
    @TenantClient() tenantClient: PrismaClient,
    @Body() createStockTransactionDto: CreateStockTransactionDto,
    @Request() req,
  ) {
    return this.stockTransactionsService.create(
      tenantClient,
      createStockTransactionDto,
      req.user.id,
    );
  }

  @Get()
  @RequirePermission("stock.read")
  @ApiOperation({ summary: "Get all stock transactions" })
  @ApiResponse({
    status: 200,
    description: "Transactions retrieved successfully",
  })
  @ApiQuery({
    name: "productId",
    required: false,
    description: "Filter by product ID",
  })
  @ApiQuery({
    name: "locationId",
    required: false,
    description: "Filter by location ID",
  })
  @ApiQuery({
    name: "type",
    required: false,
    description: "Filter by transaction type",
  })
  findAll(
    @TenantClient() tenantClient: PrismaClient,
    @Query() paginationDto: PaginationDto,
    @Query("productId") productId?: string,
    @Query("locationId") locationId?: string,
    @Query("type") type?: string,
  ) {
    return this.stockTransactionsService.findAll(
      tenantClient,
      paginationDto,
      productId,
      locationId,
      type,
    );
  }

  @Auditable({ module: AuditModule.STOCK_TRANSACTIONS })
  @Post("bulk-adjust")
  @RequirePermission("stock.adjust")
  @ApiOperation({ summary: "Bulk adjust stock for multiple products" })
  @ApiResponse({
    status: 201,
    description: "Bulk adjustment completed successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request - validation failed" })
  bulkAdjust(
    @TenantClient() tenantClient: PrismaClient,
    @Body() bulkAdjustmentDto: BulkAdjustmentDto,
    @Request() req,
  ) {
    return this.stockTransactionsService.bulkAdjust(tenantClient, bulkAdjustmentDto, req.user.id);
  }

  @Auditable({ module: AuditModule.STOCK_TRANSACTIONS })
  @Post("bulk-transfer")
  @RequirePermission("stock.transfer")
  @ApiOperation({ summary: "Bulk transfer stock for multiple products" })
  @ApiResponse({
    status: 201,
    description: "Bulk transfer completed successfully",
  })
  @ApiResponse({ status: 400, description: "Bad request - validation failed" })
  bulkTransfer(
    @TenantClient() tenantClient: PrismaClient,
    @Body() bulkTransferDto: BulkTransferDto,
    @Request() req,
  ) {
    return this.stockTransactionsService.bulkTransfer(tenantClient, bulkTransferDto, req.user.id);
  }

  @Get(":id")
  @RequirePermission("stock.read")
  @ApiOperation({ summary: "Get transaction by ID" })
  @ApiResponse({
    status: 200,
    description: "Transaction retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Transaction not found" })
  findOne(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.stockTransactionsService.findOne(tenantClient, id);
  }
}
