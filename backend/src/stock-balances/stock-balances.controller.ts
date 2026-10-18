import { Controller, Get, Query, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { StockBalancesService } from "./stock-balances.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PaginationDto } from "../common/dto/pagination.dto";
import { StockBalancesQueryDto } from "./dto/stock-balances-query.dto";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient } from "@prisma/tenant-client";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";

@ApiTags("Stock Balances")
@Controller("stock/balances")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class StockBalancesController {
  constructor(private readonly stockBalancesService: StockBalancesService) {}

  @Get()
  @RequirePermission("stock.read")
  @ApiOperation({ summary: "Get all stock balances" })
  @ApiResponse({
    status: 200,
    description: "Stock balances retrieved successfully",
  })
  findAll(@TenantClient() tenantClient: PrismaClient, @Query() queryDto: StockBalancesQueryDto) {
    const { page, limit, productId, locationId } = queryDto;
    const paginationDto = { page, limit } as PaginationDto;
    return this.stockBalancesService.findAll(tenantClient, paginationDto, productId, locationId);
  }

  @Get("reorder-alerts")
  @RequirePermission("stock.read")
  @ApiOperation({ summary: "Get reorder alerts" })
  @ApiResponse({
    status: 200,
    description: "Reorder alerts retrieved successfully",
  })
  getReorderAlerts(@TenantClient() tenantClient: PrismaClient) {
    return this.stockBalancesService.getReorderAlerts(tenantClient);
  }

  @Get("total/:productId")
  @RequirePermission("stock.read")
  @ApiOperation({
    summary: "Get total stock for a product across all locations",
  })
  @ApiResponse({
    status: 200,
    description: "Total stock retrieved successfully",
  })
  getTotalStock(@TenantClient() tenantClient: PrismaClient, @Param("productId") productId: string) {
    return this.stockBalancesService.getTotalStock(tenantClient, productId);
  }

  @Get("location/:locationId")
  @RequirePermission("stock.read")
  @ApiOperation({ summary: "Get stock for a specific location" })
  @ApiResponse({
    status: 200,
    description: "Location stock retrieved successfully",
  })
  getLocationStock(
    @TenantClient() tenantClient: PrismaClient,
    @Param("locationId") locationId: string,
  ) {
    return this.stockBalancesService.getLocationStock(tenantClient, locationId);
  }

  @Get("total-inventory-cost")
  @RequirePermission("stock.read")
  @ApiOperation({
    summary: "Get total inventory cost (sum of costPrice * quantity for all stock)",
  })
  @ApiResponse({
    status: 200,
    description: "Total inventory cost calculated successfully",
  })
  async getTotalInventoryCost(@TenantClient() tenantClient: PrismaClient) {
    const totalCost = await this.stockBalancesService.getTotalInventoryCost(tenantClient);
    return { totalCost };
  }

  @Get("location-wise-cost")
  @RequirePermission("stock.read")
  @ApiOperation({ summary: "Get inventory cost breakdown by location" })
  @ApiResponse({
    status: 200,
    description: "Location-wise inventory costs retrieved successfully",
  })
  async getLocationWiseInventoryCost(@TenantClient() tenantClient: PrismaClient) {
    return this.stockBalancesService.getLocationWiseInventoryCost(tenantClient);
  }
}
