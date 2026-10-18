import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { SalesReportsService } from "./sales-reports.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient } from "@prisma/tenant-client";

@ApiTags("Sales Reports")
@Controller("sales-reports")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SalesReportsController {
  constructor(private readonly salesReportsService: SalesReportsService) {}

  @Get("daily")
  @ApiOperation({ summary: "Get daily sales report" })
  @ApiQuery({ name: "date", required: false })
  @ApiResponse({ status: 200, description: "Daily sales report retrieved successfully" })
  async getDailyReport(@TenantClient() tenantClient: PrismaClient, @Query("date") date?: string) {
    const targetDate = date || new Date().toISOString().split("T")[0];
    return this.salesReportsService.getDailyReport(tenantClient, targetDate);
  }

  @Get("monthly")
  @ApiOperation({ summary: "Get monthly sales report" })
  @ApiQuery({ name: "year", required: false })
  @ApiQuery({ name: "month", required: false })
  @ApiResponse({ status: 200, description: "Monthly sales report retrieved successfully" })
  async getMonthlyReport(
    @TenantClient() tenantClient: PrismaClient,
    @Query("year") year?: string,
    @Query("month") month?: string,
  ) {
    const currentDate = new Date();
    const targetYear = year ? parseInt(year) : currentDate.getFullYear();
    const targetMonth = month ? parseInt(month) : currentDate.getMonth() + 1;
    return this.salesReportsService.getMonthlyReport(tenantClient, targetYear, targetMonth);
  }

  @Get("hourly")
  @ApiOperation({ summary: "Get hourly sales distribution for a given day" })
  @ApiQuery({ name: "date", required: false })
  @ApiResponse({ status: 200, description: "Hourly sales report retrieved successfully" })
  async getHourlyReport(
    @TenantClient() tenantClient: PrismaClient,
    @Query("date") date?: string,
  ) {
    const targetDate = date || new Date().toISOString().split("T")[0];
    return this.salesReportsService.getHourlyReport(tenantClient, targetDate);
  }

  @Get("product")
  @ApiOperation({ summary: "Get sales breakdown by product" })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiQuery({ name: "productId", required: false })
  @ApiResponse({ status: 200, description: "Sales report by product retrieved successfully" })
  async getByProduct(
    @TenantClient() tenantClient: PrismaClient,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("productId") productId?: string,
  ) {
    return this.salesReportsService.getByProduct(tenantClient, startDate, endDate, productId);
  }

  @Get("location")
  @ApiOperation({ summary: "Get aggregate sales report for a date range" })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiResponse({ status: 200, description: "Sales aggregate retrieved successfully" })
  async getByLocation(
    @TenantClient() tenantClient: PrismaClient,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.salesReportsService.getByLocation(tenantClient, startDate, endDate);
  }

  @Get("plant")
  @ApiOperation({ summary: "Get aggregate sales report for a date range" })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiResponse({ status: 200, description: "Sales aggregate retrieved successfully" })
  async getByPlant(
    @TenantClient() tenantClient: PrismaClient,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
  ) {
    return this.salesReportsService.getByPlant(tenantClient, startDate, endDate);
  }
}
