import { Controller, Get, Query, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { StockMovementReportsService } from "./stock-movement-reports.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient } from "@prisma/tenant-client";
import { TenantRequest } from "../common/middleware/tenant-context.middleware";

@ApiTags("Stock Movement Reports")
@Controller("stock-movement-reports")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class StockMovementReportsController {
  constructor(private readonly stockMovementReportsService: StockMovementReportsService) {}

  @Get("inbound")
  @ApiOperation({ summary: "Get inbound stock movements" })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiQuery({ name: "productId", required: false })
  @ApiResponse({
    status: 200,
    description: "Inbound movements retrieved successfully",
  })
  async getInboundMovements(
    @TenantClient() tenantClient: PrismaClient,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("productId") productId?: string,
  ) {
    return this.stockMovementReportsService.getInboundMovements(
      tenantClient,
      startDate,
      endDate,
      productId,
    );
  }

  @Get("outbound")
  @ApiOperation({ summary: "Get outbound stock movements" })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiQuery({ name: "productId", required: false })
  @ApiResponse({
    status: 200,
    description: "Outbound movements retrieved successfully",
  })
  async getOutboundMovements(
    @TenantClient() tenantClient: PrismaClient,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("productId") productId?: string,
  ) {
    return this.stockMovementReportsService.getOutboundMovements(
      tenantClient,
      startDate,
      endDate,
      productId,
    );
  }

  @Get("transfers")
  @ApiOperation({ summary: "Get stock transfers" })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiResponse({
    status: 200,
    description: "Stock transfers retrieved successfully",
  })
  async getTransfers(
    @TenantClient() tenantClient: PrismaClient,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.stockMovementReportsService.getTransfers(tenantClient, startDate, endDate);
  }

  @Get("adjustments")
  @ApiOperation({ summary: "Get stock adjustments" })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiQuery({ name: "productId", required: false })
  @ApiResponse({
    status: 200,
    description: "Stock adjustments retrieved successfully",
  })
  async getAdjustments(
    @TenantClient() tenantClient: PrismaClient,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("productId") productId?: string,
  ) {
    return this.stockMovementReportsService.getAdjustments(
      tenantClient,
      startDate,
      endDate,
      productId,
    );
  }

  @Get("waste")
  @ApiOperation({ summary: "Get waste movements" })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiQuery({ name: "productId", required: false })
  @ApiResponse({
    status: 200,
    description: "Waste movements retrieved successfully",
  })
  async getWasteMovements(
    @TenantClient() tenantClient: PrismaClient,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("productId") productId?: string,
  ) {
    return this.stockMovementReportsService.getWasteMovements(
      tenantClient,
      startDate,
      endDate,
      productId,
    );
  }
}
