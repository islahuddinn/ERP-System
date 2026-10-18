import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { CostingService } from "./costing.service";
import {
  CostDashboardQueryDto,
  CostReportQueryDto,
  ProfitabilityQueryDto,
} from "./dto/costing.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient } from "@prisma/tenant-client";
import { TenantRequest } from "../common/middleware/tenant-context.middleware";
import { Req } from "@nestjs/common";

@ApiTags("Costing")
@Controller("costing")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class CostingController {
  constructor(private readonly costingService: CostingService) {}

  @Get("dashboard")
  @RequirePermission("reports.view_all")
  @ApiOperation({ summary: "Get cost dashboard data" })
  @ApiResponse({
    status: 200,
    description: "Cost dashboard data retrieved successfully",
  })
  @ApiQuery({
    name: "period",
    required: false,
    enum: ["this_month", "last_month", "this_quarter", "this_year", "custom"],
  })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  @ApiQuery({ name: "siteId", required: false, type: String })
  @ApiQuery({ name: "productId", required: false, type: String })
  async getDashboard(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Query() query: CostDashboardQueryDto,
  ) {
    return this.costingService.getCostDashboard(tenantClient, req.tenantId, query);
  }

  @Get("reports")
  @RequirePermission("reports.view_all")
  @ApiOperation({ summary: "Get cost reports" })
  @ApiResponse({
    status: 200,
    description: "Cost reports retrieved successfully",
  })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  @ApiQuery({ name: "siteId", required: false, type: String })
  @ApiQuery({ name: "productId", required: false, type: String })
  @ApiQuery({ name: "page", required: false, type: Number })
  @ApiQuery({ name: "limit", required: false, type: Number })
  async getReports(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Query() query: CostReportQueryDto,
  ) {
    return this.costingService.getCostReports(tenantClient, req.tenantId, query);
  }

  @Get("profitability")
  @RequirePermission("reports.view_all")
  @ApiOperation({ summary: "Get profitability data" })
  @ApiResponse({
    status: 200,
    description: "Profitability data retrieved successfully",
  })
  @ApiQuery({
    name: "period",
    required: false,
    enum: ["this_month", "last_month", "this_quarter", "this_year", "custom"],
  })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  @ApiQuery({ name: "siteId", required: false, type: String })
  async getProfitability(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Query() query: ProfitabilityQueryDto,
  ) {
    return this.costingService.getProfitability(tenantClient, req.tenantId, query);
  }

  @Get("profit/daily")
  @RequirePermission("reports.view_all")
  @ApiOperation({ summary: "Get daily profit data" })
  @ApiResponse({
    status: 200,
    description: "Daily profit data retrieved successfully",
  })
  @ApiQuery({
    name: "period",
    required: false,
    enum: ["this_month", "last_month", "this_quarter", "this_year", "custom"],
  })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  @ApiQuery({ name: "siteId", required: false, type: String })
  async getDailyProfit(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Query() query: ProfitabilityQueryDto,
  ) {
    return this.costingService.getDailyProfit(tenantClient, req.tenantId, query);
  }

  @Get("profit/monthly")
  @RequirePermission("reports.view_all")
  @ApiOperation({ summary: "Get monthly profit data" })
  @ApiResponse({
    status: 200,
    description: "Monthly profit data retrieved successfully",
  })
  @ApiQuery({
    name: "period",
    required: false,
    enum: ["this_month", "last_month", "this_quarter", "this_year", "custom"],
  })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  @ApiQuery({ name: "siteId", required: false, type: String })
  async getMonthlyProfit(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Query() query: ProfitabilityQueryDto,
  ) {
    return this.costingService.getMonthlyProfit(tenantClient, req.tenantId, query);
  }

  @Get("profit/product")
  @RequirePermission("reports.view_all")
  @ApiOperation({ summary: "Get product profit data" })
  @ApiResponse({
    status: 200,
    description: "Product profit data retrieved successfully",
  })
  @ApiQuery({
    name: "period",
    required: false,
    enum: ["this_month", "last_month", "this_quarter", "this_year", "custom"],
  })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  @ApiQuery({ name: "siteId", required: false, type: String })
  async getProductProfit(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Query() query: ProfitabilityQueryDto,
  ) {
    return this.costingService.getProductProfit(tenantClient, req.tenantId, query);
  }

  @Get("profit/plant")
  @RequirePermission("reports.view_all")
  @ApiOperation({ summary: "Get plant profit data" })
  @ApiResponse({
    status: 200,
    description: "Plant profit data retrieved successfully",
  })
  @ApiQuery({
    name: "period",
    required: false,
    enum: ["this_month", "last_month", "this_quarter", "this_year", "custom"],
  })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  @ApiQuery({ name: "siteId", required: false, type: String })
  async getPlantProfit(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Query() query: ProfitabilityQueryDto,
  ) {
    return this.costingService.getPlantProfit(tenantClient, req.tenantId, query);
  }

  @Get("profit/factory")
  @RequirePermission("reports.view_all")
  @ApiOperation({ summary: "Get factory profit overview" })
  @ApiResponse({
    status: 200,
    description: "Factory profit data retrieved successfully",
  })
  @ApiQuery({ name: "siteId", required: true, type: String })
  @ApiQuery({ name: "startDate", required: false, type: String })
  @ApiQuery({ name: "endDate", required: false, type: String })
  async getFactoryProfit(
    @TenantClient() tenantClient: PrismaClient,
    @Query("siteId") siteId: string,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.costingService.getFactoryProfit(tenantClient, siteId, startDate, endDate);
  }
}
