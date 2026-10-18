import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { ExpenseReportsService } from "./expense-reports.service";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { TenantClient } from "../../common/decorators/tenant-client.decorator";
import { PrismaClient } from "@prisma/tenant-client";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";

@ApiTags("Expense Reports")
@Controller("expenses/reports")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ExpenseReportsController {
  constructor(private readonly reportsService: ExpenseReportsService) {}

  @Get("summary")
  @RequirePermission("expenses.reports")
  @ApiOperation({
    summary: "Get comprehensive expense summary with all breakdowns",
  })
  @ApiQuery({
    name: "startDate",
    required: false,
    type: String,
    description: "Start date (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    type: String,
    description: "End date (YYYY-MM-DD)",
  })
  getSummary(
    @TenantClient() tenantClient: PrismaClient,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.reportsService.getSummary(tenantClient, startDate, endDate);
  }

  @Get("category-breakdown")
  @RequirePermission("expenses.reports")
  @ApiOperation({ summary: "Get expense breakdown by category" })
  @ApiQuery({
    name: "startDate",
    required: false,
    type: String,
    description: "Start date (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    type: String,
    description: "End date (YYYY-MM-DD)",
  })
  getCategoryBreakdown(
    @TenantClient() tenantClient: PrismaClient,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.reportsService.getCategoryBreakdown(tenantClient, startDate, endDate);
  }

  @Get("payment-method-breakdown")
  @RequirePermission("expenses.reports")
  @ApiOperation({ summary: "Get expense breakdown by payment method" })
  @ApiQuery({
    name: "startDate",
    required: false,
    type: String,
    description: "Start date (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    type: String,
    description: "End date (YYYY-MM-DD)",
  })
  getPaymentMethodBreakdown(
    @TenantClient() tenantClient: PrismaClient,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.reportsService.getPaymentMethodBreakdown(tenantClient, startDate, endDate);
  }

  @Get("location-breakdown")
  @RequirePermission("expenses.reports")
  @ApiOperation({ summary: "Get expense breakdown by location" })
  @ApiQuery({
    name: "startDate",
    required: false,
    type: String,
    description: "Start date (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    type: String,
    description: "End date (YYYY-MM-DD)",
  })
  getLocationBreakdown(
    @TenantClient() tenantClient: PrismaClient,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.reportsService.getLocationBreakdown(tenantClient, startDate, endDate);
  }

  @Get("status-breakdown")
  @RequirePermission("expenses.reports")
  @ApiOperation({ summary: "Get expense breakdown by status" })
  @ApiQuery({
    name: "startDate",
    required: false,
    type: String,
    description: "Start date (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    type: String,
    description: "End date (YYYY-MM-DD)",
  })
  getStatusBreakdown(
    @TenantClient() tenantClient: PrismaClient,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.reportsService.getStatusBreakdown(tenantClient, startDate, endDate);
  }

  @Get("trends")
  @RequirePermission("expenses.reports")
  @ApiOperation({ summary: "Get expense trends over time" })
  @ApiQuery({
    name: "startDate",
    required: false,
    type: String,
    description: "Start date (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    type: String,
    description: "End date (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "groupBy",
    required: false,
    enum: ["day", "week", "month"],
    description: "Group by period",
  })
  getTrends(
    @TenantClient() tenantClient: PrismaClient,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("groupBy") groupBy?: "day" | "week" | "month",
  ) {
    return this.reportsService.getTrends(tenantClient, startDate, endDate, groupBy || "month");
  }

  @Get("monthly-comparison")
  @RequirePermission("expenses.reports")
  @ApiOperation({ summary: "Get monthly expense comparison" })
  @ApiQuery({
    name: "startDate",
    required: false,
    type: String,
    description: "Start date (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    type: String,
    description: "End date (YYYY-MM-DD)",
  })
  getMonthlyComparison(
    @TenantClient() tenantClient: PrismaClient,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.reportsService.getMonthlyComparison(tenantClient, startDate, endDate);
  }

  @Get("plant")
  @RequirePermission("expenses.reports")
  @ApiOperation({ summary: "Get expense breakdown by plant" })
  @ApiQuery({
    name: "startDate",
    required: false,
    type: String,
    description: "Start date (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    type: String,
    description: "End date (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "plantId",
    required: false,
    type: String,
    description: "Filter by plant ID",
  })
  getByPlant(
    @TenantClient() tenantClient: PrismaClient,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("plantId") plantId?: string,
  ) {
    return this.reportsService.getByPlant(tenantClient, startDate, endDate, plantId);
  }

  @Get("profit-impact")
  @RequirePermission("expenses.reports")
  @ApiOperation({ summary: "Get expense profit impact analysis" })
  @ApiQuery({
    name: "startDate",
    required: false,
    type: String,
    description: "Start date (YYYY-MM-DD)",
  })
  @ApiQuery({
    name: "endDate",
    required: false,
    type: String,
    description: "End date (YYYY-MM-DD)",
  })
  getProfitImpact(
    @TenantClient() tenantClient: PrismaClient,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.reportsService.getProfitImpact(tenantClient, startDate, endDate);
  }
}
