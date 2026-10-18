import { Controller, Get, Query, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { InventoryReportsService } from "./inventory-reports.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient } from "@prisma/tenant-client";
import { TenantRequest } from "../common/middleware/tenant-context.middleware";

@ApiTags("Inventory Reports")
@Controller("inventory-reports")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InventoryReportsController {
  constructor(private readonly inventoryReportsService: InventoryReportsService) {}

  @Get("valuation")
  @ApiOperation({ summary: "Get inventory valuation" })
  @ApiQuery({
    name: "method",
    required: false,
    enum: ["FIFO", "MOVING_AVG"],
    description: "Valuation method",
  })
  @ApiResponse({
    status: 200,
    description: "Inventory valuation retrieved successfully",
  })
  async getValuation(
    @TenantClient() tenantClient: PrismaClient,
    @Query("method") method?: "FIFO" | "MOVING_AVG",
  ) {
    return this.inventoryReportsService.getValuation(tenantClient, method || "MOVING_AVG");
  }

  @Get("aging")
  @ApiOperation({ summary: "Get stock aging report" })
  @ApiResponse({
    status: 200,
    description: "Stock aging report retrieved successfully",
  })
  async getStockAging(@TenantClient() tenantClient: PrismaClient) {
    return this.inventoryReportsService.getStockAging(tenantClient);
  }

  @Get("snapshot")
  @ApiOperation({ summary: "Get stock snapshot" })
  @ApiQuery({
    name: "date",
    required: false,
    description: "Snapshot date (YYYY-MM-DD)",
  })
  @ApiResponse({
    status: 200,
    description: "Stock snapshot retrieved successfully",
  })
  async getStockSnapshot(@TenantClient() tenantClient: PrismaClient, @Query("date") date?: string) {
    return this.inventoryReportsService.getStockSnapshot(tenantClient, date);
  }
}
