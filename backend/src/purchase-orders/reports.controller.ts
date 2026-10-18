import { Controller, Get, Query, UseGuards, Res } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { Response } from "express";
import { PurchaseReportsService } from "./reports.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { ReportsQueryDto } from "./dto/reports-query.dto";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient } from "@prisma/tenant-client";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";

@ApiTags("Purchase Order Reports")
@Controller("purchase-orders/reports")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PurchaseReportsController {
  constructor(private readonly reportsService: PurchaseReportsService) {}

  @Get()
  @RequirePermission("reports.view_all")
  @ApiOperation({ summary: "Get comprehensive purchase reports" })
  @ApiResponse({
    status: 200,
    description: "Purchase reports retrieved successfully",
  })
  getReports(@TenantClient() tenantClient: PrismaClient, @Query() queryDto: ReportsQueryDto) {
    return this.reportsService.getReports(tenantClient, queryDto);
  }

  @Get("export/csv")
  @RequirePermission("reports.export")
  @ApiOperation({ summary: "Export purchase reports to CSV" })
  @ApiResponse({
    status: 200,
    description: "CSV export generated successfully",
  })
  async exportCsv(
    @TenantClient() tenantClient: PrismaClient,
    @Query() queryDto: ReportsQueryDto,
    @Res() res: Response,
  ) {
    const csvData = await this.reportsService.exportToCsv(tenantClient, queryDto);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=purchase-reports.csv");
    res.send(csvData);
  }

  @Get("export/pdf")
  @RequirePermission("reports.export")
  @ApiOperation({ summary: "Export purchase reports to PDF" })
  @ApiResponse({
    status: 200,
    description: "PDF export generated successfully",
  })
  async exportPdf(
    @TenantClient() tenantClient: PrismaClient,
    @Query() queryDto: ReportsQueryDto,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.reportsService.exportToPdf(tenantClient, queryDto);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=purchase-reports.pdf");
    res.send(pdfBuffer);
  }

  @Get("monthly-comparison")
  @RequirePermission("reports.view_all")
  @ApiOperation({ summary: "Get monthly purchase vs return comparison" })
  @ApiResponse({
    status: 200,
    description: "Monthly comparison retrieved successfully",
  })
  getMonthlyComparison(
    @TenantClient() tenantClient: PrismaClient,
    @Query() queryDto: ReportsQueryDto,
  ) {
    return this.reportsService.getMonthlyComparison(tenantClient, queryDto);
  }

  @Get("product-analysis")
  @RequirePermission("reports.view_all")
  @ApiOperation({ summary: "Get top purchased products analysis" })
  @ApiResponse({
    status: 200,
    description: "Product analysis retrieved successfully",
  })
  getMaterialAnalysis(
    @TenantClient() tenantClient: PrismaClient,
    @Query() queryDto: ReportsQueryDto,
  ) {
    return this.reportsService.getMaterialAnalysis(tenantClient, queryDto);
  }
}
