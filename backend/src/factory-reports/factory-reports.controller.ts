import { Controller, Get, Query, UseGuards, Req, Res } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { FactoryReportsService } from "./factory-reports.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient } from "@prisma/tenant-client";
import { TenantRequest } from "../common/middleware/tenant-context.middleware";
import { Response } from "express";

@ApiTags("Factory Reports")
@Controller("factory/reports")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FactoryReportsController {
  constructor(private readonly factoryReportsService: FactoryReportsService) {}

  @Get("production")
  @ApiOperation({ summary: "Get production reports" })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiQuery({ name: "siteId", required: false })
  @ApiResponse({
    status: 200,
    description: "Production reports retrieved successfully",
  })
  async getProductionReport(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("siteId") siteId?: string,
  ) {
    return this.factoryReportsService.getProductionReport(
      tenantClient,
      req.tenantId,
      startDate,
      endDate,
      siteId,
    );
  }

  @Get("material")
  @ApiOperation({ summary: "Get material reports" })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiQuery({ name: "plantId", required: false })
  @ApiResponse({
    status: 200,
    description: "Material reports retrieved successfully",
  })
  async getMaterialReport(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("plantId") plantId?: string,
  ) {
    return this.factoryReportsService.getMaterialReport(
      tenantClient,
      req.tenantId,
      startDate,
      endDate,
      plantId,
    );
  }

  @Get("quality")
  @ApiOperation({ summary: "Get quality reports" })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiQuery({ name: "plantId", required: false })
  @ApiResponse({
    status: 200,
    description: "Quality reports retrieved successfully",
  })
  async getQualityReport(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("plantId") plantId?: string,
  ) {
    return this.factoryReportsService.getQualityReport(
      tenantClient,
      req.tenantId,
      startDate,
      endDate,
      plantId,
    );
  }

  @Get("waste")
  @ApiOperation({ summary: "Get waste reports" })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiQuery({ name: "plantId", required: false })
  @ApiResponse({
    status: 200,
    description: "Waste reports retrieved successfully",
  })
  async getWasteReport(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("plantId") plantId?: string,
  ) {
    return this.factoryReportsService.getWasteReport(
      tenantClient,
      req.tenantId,
      startDate,
      endDate,
      plantId,
    );
  }

  @Get("warehouse")
  @ApiOperation({ summary: "Get warehouse reports" })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiQuery({ name: "warehouseId", required: false })
  @ApiResponse({
    status: 200,
    description: "Warehouse reports retrieved successfully",
  })
  async getWarehouseReport(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("warehouseId") warehouseId?: string,
  ) {
    return this.factoryReportsService.getWarehouseReport(
      tenantClient,
      req.tenantId,
      startDate,
      endDate,
      warehouseId,
    );
  }

  @Get("costing")
  @ApiOperation({ summary: "Get costing reports" })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiQuery({ name: "siteId", required: false })
  @ApiResponse({
    status: 200,
    description: "Costing reports retrieved successfully",
  })
  async getCostingReport(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("siteId") siteId?: string,
  ) {
    return this.factoryReportsService.getCostingReport(
      tenantClient,
      req.tenantId,
      startDate,
      endDate,
      siteId,
    );
  }

  @Get("production/pdf")
  @ApiOperation({ summary: "Download production report as PDF" })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiQuery({ name: "plantId", required: false })
  @ApiResponse({ status: 200, description: "PDF generated successfully" })
  async downloadProductionReportPDF(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Res() res: Response,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("plantId") plantId?: string,
  ) {
    const pdfBuffer = await this.factoryReportsService.generateProductionReportPDF(
      tenantClient,
      req.tenantId,
      startDate,
      endDate,
      plantId,
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=production-report-${Date.now()}.pdf`,
    );
    res.send(pdfBuffer);
  }

  @Get("material/pdf")
  @ApiOperation({ summary: "Download material report as PDF" })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiQuery({ name: "plantId", required: false })
  @ApiResponse({ status: 200, description: "PDF generated successfully" })
  async downloadMaterialReportPDF(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Res() res: Response,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("plantId") plantId?: string,
  ) {
    const pdfBuffer = await this.factoryReportsService.generateMaterialReportPDF(
      tenantClient,
      req.tenantId,
      startDate,
      endDate,
      plantId,
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=material-report-${Date.now()}.pdf`);
    res.send(pdfBuffer);
  }

  @Get("quality/pdf")
  @ApiOperation({ summary: "Download quality report as PDF" })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiQuery({ name: "plantId", required: false })
  @ApiResponse({ status: 200, description: "PDF generated successfully" })
  async downloadQualityReportPDF(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Res() res: Response,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("plantId") plantId?: string,
  ) {
    const pdfBuffer = await this.factoryReportsService.generateQualityReportPDF(
      tenantClient,
      req.tenantId,
      startDate,
      endDate,
      plantId,
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=quality-report-${Date.now()}.pdf`);
    res.send(pdfBuffer);
  }

  @Get("waste/pdf")
  @ApiOperation({ summary: "Download waste report as PDF" })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiQuery({ name: "plantId", required: false })
  @ApiResponse({ status: 200, description: "PDF generated successfully" })
  async downloadWasteReportPDF(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Res() res: Response,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("plantId") plantId?: string,
  ) {
    const pdfBuffer = await this.factoryReportsService.generateWasteReportPDF(
      tenantClient,
      req.tenantId,
      startDate,
      endDate,
      plantId,
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=waste-report-${Date.now()}.pdf`);
    res.send(pdfBuffer);
  }

  @Get("warehouse/pdf")
  @ApiOperation({ summary: "Download warehouse report as PDF" })
  @ApiQuery({ name: "startDate", required: false })
  @ApiQuery({ name: "endDate", required: false })
  @ApiQuery({ name: "warehouseId", required: false })
  @ApiResponse({ status: 200, description: "PDF generated successfully" })
  async downloadWarehouseReportPDF(
    @TenantClient() tenantClient: PrismaClient,
    @Req() req: TenantRequest,
    @Res() res: Response,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("warehouseId") warehouseId?: string,
  ) {
    const pdfBuffer = await this.factoryReportsService.generateWarehouseReportPDF(
      tenantClient,
      req.tenantId,
      startDate,
      endDate,
      warehouseId,
    );
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=warehouse-report-${Date.now()}.pdf`);
    res.send(pdfBuffer);
  }
}
