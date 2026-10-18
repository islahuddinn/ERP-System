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
  Request,
  Res,
  Put,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { Response } from "express";
import { PosService } from "./pos.service";
import { CreateSaleDto } from "./dto/create-sale.dto";
import { AddPaymentDto } from "./dto/add-payment.dto";
import { RefundSaleDto } from "./dto/refund-sale.dto";
import { SaleFiltersDto } from "./dto/sale-filters.dto";
import { UpdateSaleStatusDto } from "./dto/update-sale-status.dto";
import { UpdateSaleDto } from "./dto/update-sale.dto";
import { CancelSaleDto } from "./dto/cancel-sale.dto";
import { HoldInvoiceDto, RestoreHeldInvoiceDto } from "./dto/hold-invoice.dto";
import {
  CreateSaleReturnDto,
  SaleReturnFiltersDto,
  ProcessSaleReturnDto,
  CancelSaleReturnDto,
} from "./dto/create-sale-return.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantClient, TenantId } from "../common/decorators/tenant-client.decorator";
import { PrismaClient } from "@prisma/tenant-client";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";

@ApiTags("POS")
@Controller("pos")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Post("sales")
  @RequirePermission("pos.create_sale")
  @ApiOperation({ summary: "Create a new sale" })
  @ApiResponse({ status: 201, description: "Sale created successfully" })
  @ApiResponse({ status: 400, description: "Bad request - validation failed" })
  @ApiResponse({ status: 404, description: "Location or customer not found" })
  createSale(
    @TenantClient() tenantClient: PrismaClient,
    @Body() createSaleDto: CreateSaleDto,
    @Request() req,
  ) {
    return this.posService.createSale(tenantClient, createSaleDto, req.user.id);
  }

  @Get("sales")
  @RequirePermission("pos.view_all_sales")
  @ApiOperation({ summary: "Get all sales with filters and pagination" })
  @ApiResponse({ status: 200, description: "Sales retrieved successfully" })
  getSales(@TenantClient() tenantClient: PrismaClient, @Query() filters: SaleFiltersDto) {
    return this.posService.getSales(tenantClient, filters);
  }

  @Get("sales-statistics")
  @RequirePermission("pos.view_all_sales")
  @ApiOperation({ summary: "Get sales statistics with filters" })
  @ApiResponse({
    status: 200,
    description: "Sales statistics retrieved successfully",
  })
  getSalesStats(@TenantClient() tenantClient: PrismaClient, @Query() filters: SaleFiltersDto) {
    return this.posService.getSalesStats(tenantClient, filters);
  }

  @Get("sales/daily-summary")
  @RequirePermission("pos.view_all_sales")
  @ApiOperation({ summary: "Get daily sales summary" })
  @ApiQuery({
    name: "locationId",
    description: "Filter by location",
    required: false,
  })
  @ApiQuery({ name: "date", description: "Date (YYYY-MM-DD)", required: false })
  @ApiResponse({
    status: 200,
    description: "Daily summary retrieved successfully",
  })
  getDailySummary(
    @TenantClient() tenantClient: PrismaClient,
    @Query("locationId") locationId?: string,
    @Query("date") date?: string,
  ) {
    return this.posService.getDailySummary(tenantClient, locationId, date);
  }

  @Get("sales/daily-summary/export/csv")
  @RequirePermission("reports.export")
  @ApiOperation({ summary: "Export daily sales summary to CSV" })
  @ApiQuery({
    name: "locationId",
    description: "Filter by location",
    required: false,
  })
  @ApiQuery({ name: "date", description: "Date (YYYY-MM-DD)", required: false })
  @ApiResponse({
    status: 200,
    description: "CSV export generated successfully",
  })
  async exportDailySalesCsv(
    @TenantClient() tenantClient: PrismaClient,
    @Query("locationId") locationId?: string,
    @Query("date") date?: string,
    @Res() res?: Response,
  ) {
    const csvData = await this.posService.exportDailySalesToCsv(tenantClient, date, locationId);

    if (res) {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=daily-sales-report.csv");
      res.send(csvData);
    } else {
      return { data: csvData };
    }
  }

  @Get("sales/daily-summary/export/pdf")
  @RequirePermission("reports.export")
  @ApiOperation({ summary: "Export daily sales summary to PDF" })
  @ApiQuery({
    name: "locationId",
    description: "Filter by location",
    required: false,
  })
  @ApiQuery({ name: "date", description: "Date (YYYY-MM-DD)", required: false })
  @ApiResponse({
    status: 200,
    description: "PDF export generated successfully",
  })
  async exportDailySalesPdf(
    @TenantClient() tenantClient: PrismaClient,
    @TenantId() tenantId: string,
    @Query("locationId") locationId?: string,
    @Query("date") date?: string,
    @Res() res?: Response,
  ) {
    const pdfBuffer = await this.posService.exportDailySalesToPdf(
      tenantClient,
      tenantId,
      date,
      locationId,
    );

    if (res) {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", "attachment; filename=daily-sales-report.pdf");
      res.send(pdfBuffer);
    } else {
      return { data: pdfBuffer.toString("base64") };
    }
  }

  @Get("sales/:id")
  @RequirePermission("pos.view_all_sales")
  @ApiOperation({ summary: "Get sale details by ID" })
  @ApiResponse({
    status: 200,
    description: "Sale details retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Sale not found" })
  getSaleById(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.posService.getSaleById(tenantClient, id);
  }

  @Patch("sales/:id/status")
  @RequirePermission("pos.cancel_sale")
  @ApiOperation({ summary: "Update sale status" })
  @ApiResponse({ status: 200, description: "Sale status updated successfully" })
  @ApiResponse({ status: 400, description: "Invalid status transition" })
  @ApiResponse({ status: 404, description: "Sale not found" })
  updateSaleStatus(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body() updateSaleStatusDto: UpdateSaleStatusDto,
    @Request() req,
  ) {
    return this.posService.updateSaleStatus(tenantClient, id, updateSaleStatusDto, req.user.id);
  }

  @Post("sales/:id/recalculate-status")
  @RequirePermission("pos.update_sale")
  @ApiOperation({
    summary: "Recalculate sale status based on current payments and returns",
  })
  @ApiResponse({
    status: 200,
    description: "Sale status recalculated successfully",
  })
  @ApiResponse({ status: 404, description: "Sale not found" })
  recalculateSaleStatus(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Request() req,
  ) {
    return this.posService.recalculateSaleStatus(tenantClient, id, req.user.id);
  }

  @Patch("sales/:id")
  @RequirePermission("pos.update_sale")
  @ApiOperation({ summary: "Edit an existing sale" })
  @ApiResponse({ status: 200, description: "Sale updated successfully" })
  @ApiResponse({
    status: 400,
    description: "Bad request - validation failed or sale cannot be edited",
  })
  @ApiResponse({ status: 404, description: "Sale not found" })
  updateSale(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body() updateSaleDto: UpdateSaleDto,
    @Request() req,
  ) {
    return this.posService.updateSale(tenantClient, id, updateSaleDto, req.user.id);
  }

  @Post("sales/:id/cancel")
  @RequirePermission("pos.cancel_sale")
  @ApiOperation({ summary: "Cancel a sale (complete rollback)" })
  @ApiResponse({ status: 200, description: "Sale cancelled successfully" })
  @ApiResponse({ status: 400, description: "Sale cannot be cancelled" })
  @ApiResponse({ status: 404, description: "Sale not found" })
  cancelSale(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body() cancelSaleDto: CancelSaleDto,
    @Request() req,
  ) {
    return this.posService.cancelSale(tenantClient, id, cancelSaleDto, req.user.id);
  }

  @Post("sales/:id/payments")
  @RequirePermission("pos.process_payment")
  @ApiOperation({ summary: "Add payment to sale" })
  @ApiResponse({ status: 200, description: "Payment added successfully" })
  @ApiResponse({ status: 400, description: "Cannot add payment to this sale" })
  @ApiResponse({ status: 404, description: "Sale not found" })
  addPayment(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") saleId: string,
    @Body() addPaymentDto: AddPaymentDto,
    @Request() req,
  ) {
    return this.posService.addPayment(tenantClient, saleId, addPaymentDto, req.user.id);
  }

  @Post("sales/:id/refund")
  @RequirePermission("pos.refund")
  @ApiOperation({ summary: "Process refund for sale (ADMIN only)" })
  @ApiResponse({ status: 200, description: "Refund processed successfully" })
  @ApiResponse({ status: 400, description: "Cannot refund this sale" })
  @ApiResponse({
    status: 403,
    description: "Only administrators can process refunds",
  })
  @ApiResponse({ status: 404, description: "Sale not found" })
  async processRefund(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") saleId: string,
    @Body() refundSaleDto: RefundSaleDto,
    @Request() req,
  ) {
    try {
      return await this.posService.processRefund(
        tenantClient,
        saleId,
        refundSaleDto,
        req.user.id,
        req.user.role,
      );
    } catch (error) {
      console.error("Refund error:", error);
      console.error("Sale ID:", saleId);
      console.error("Refund DTO:", JSON.stringify(refundSaleDto, null, 2));
      throw error;
    }
  }

  @Post("sales/:id/returns")
  @RequirePermission("pos.create_return")
  @ApiOperation({ summary: "Create a sale return for a sale" })
  @ApiResponse({ status: 201, description: "Sale return created successfully" })
  @ApiResponse({ status: 400, description: "Invalid return request" })
  createSaleReturn(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") saleId: string,
    @Body() createSaleReturnDto: CreateSaleReturnDto,
    @Request() req,
  ) {
    return this.posService.createSaleReturn(tenantClient, saleId, createSaleReturnDto, req.user.id);
  }

  @Get("sales/:id/returnable-items")
  @RequirePermission("pos.create_return")
  @ApiOperation({ summary: "Get returnable items for a sale" })
  @ApiResponse({
    status: 200,
    description: "Returnable items retrieved successfully",
  })
  getReturnableItems(@TenantClient() tenantClient: PrismaClient, @Param("id") saleId: string) {
    return this.posService.getReturnableItems(tenantClient, saleId);
  }

  @Get("returns")
  @RequirePermission("pos.view_returns")
  @ApiOperation({ summary: "List sale returns with filters" })
  @ApiResponse({
    status: 200,
    description: "Sale returns retrieved successfully",
  })
  getSaleReturns(
    @TenantClient() tenantClient: PrismaClient,
    @Query() filters: SaleReturnFiltersDto,
  ) {
    return this.posService.getSaleReturns(tenantClient, filters);
  }

  @Get("returns/:id")
  @RequirePermission("pos.view_returns")
  @ApiOperation({ summary: "Get sale return details" })
  @ApiResponse({
    status: 200,
    description: "Sale return details retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Sale return not found" })
  getSaleReturnById(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.posService.getSaleReturnById(tenantClient, id);
  }

  @Put("returns/:id/approve")
  @RequirePermission("pos.process_return")
  @ApiOperation({ summary: "Approve a sale return" })
  @ApiResponse({
    status: 200,
    description: "Sale return approved successfully",
  })
  approveSaleReturn(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Request() req,
  ) {
    return this.posService.approveSaleReturn(tenantClient, id, req.user.id);
  }

  @Put("returns/:id/process")
  @RequirePermission("pos.process_return")
  @ApiOperation({ summary: "Process a sale return (restore stock and refund)" })
  @ApiResponse({
    status: 200,
    description: "Sale return processed successfully",
  })
  processSaleReturn(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body() processSaleReturnDto: ProcessSaleReturnDto,
    @Request() req,
  ) {
    return this.posService.processSaleReturn(tenantClient, id, processSaleReturnDto, req.user.id);
  }

  @Delete("returns/:id")
  @RequirePermission("pos.process_return")
  @ApiOperation({ summary: "Cancel a sale return" })
  @ApiResponse({
    status: 200,
    description: "Sale return cancelled successfully",
  })
  cancelSaleReturn(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body() cancelSaleReturnDto: CancelSaleReturnDto,
    @Request() req,
  ) {
    return this.posService.cancelSaleReturn(tenantClient, id, cancelSaleReturnDto, req.user.id);
  }

  @Get("parked")
  @RequirePermission("pos.create_sale")
  @ApiOperation({ summary: "Get parked (draft) sales for current user" })
  @ApiResponse({
    status: 200,
    description: "Parked sales retrieved successfully",
  })
  getParkedSales(@TenantClient() tenantClient: PrismaClient, @Request() req) {
    return this.posService.getParkedSales(tenantClient, req.user.id);
  }

  @Post("park/:id")
  @RequirePermission("pos.create_sale")
  @ApiOperation({ summary: "Park a sale as draft" })
  @ApiResponse({ status: 200, description: "Sale parked successfully" })
  @ApiResponse({ status: 400, description: "Cannot park this sale" })
  @ApiResponse({ status: 403, description: "You can only park your own sales" })
  @ApiResponse({ status: 404, description: "Sale not found" })
  parkSale(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") saleId: string,
    @Request() req,
  ) {
    return this.posService.parkSale(tenantClient, saleId, req.user.id);
  }

  @Post("resume/:id")
  @RequirePermission("pos.create_sale")
  @ApiOperation({ summary: "Resume a parked sale" })
  @ApiResponse({ status: 200, description: "Sale resumed successfully" })
  @ApiResponse({ status: 400, description: "Cannot resume this sale" })
  @ApiResponse({
    status: 403,
    description: "You can only resume your own sales",
  })
  @ApiResponse({ status: 404, description: "Sale not found" })
  resumeSale(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") saleId: string,
    @Request() req,
  ) {
    return this.posService.resumeSale(tenantClient, saleId, req.user.id);
  }

  @Get("reports/sales-by-user")
  @RequirePermission("reports.view_all")
  @ApiOperation({ summary: "Get sales report by user" })
  @ApiQuery({
    name: "startDate",
    description: "Start date (YYYY-MM-DD)",
    required: false,
  })
  @ApiQuery({
    name: "endDate",
    description: "End date (YYYY-MM-DD)",
    required: false,
  })
  @ApiQuery({
    name: "locationId",
    description: "Filter by location",
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: "Sales by user report retrieved successfully",
  })
  getSalesByUserReport(
    @TenantClient() tenantClient: PrismaClient,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("locationId") locationId?: string,
  ) {
    return this.posService.getSalesByUserReport(tenantClient, startDate, endDate, locationId);
  }

  @Get("reports/top-products")
  @RequirePermission("reports.view_all")
  @ApiOperation({ summary: "Get top selling products report" })
  @ApiQuery({
    name: "startDate",
    description: "Start date (YYYY-MM-DD)",
    required: false,
  })
  @ApiQuery({
    name: "endDate",
    description: "End date (YYYY-MM-DD)",
    required: false,
  })
  @ApiQuery({
    name: "limit",
    description: "Number of top products to return",
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: "Top products report retrieved successfully",
  })
  getTopProductsReport(
    @TenantClient() tenantClient: PrismaClient,
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Query("limit") limit?: number,
  ) {
    return this.posService.getTopProductsReport(tenantClient, startDate, endDate, limit);
  }

  @Get("reports/hourly-sales")
  @RequirePermission("reports.view_all")
  @ApiOperation({ summary: "Get hourly sales breakdown" })
  @ApiQuery({ name: "date", description: "Date (YYYY-MM-DD)", required: false })
  @ApiQuery({
    name: "locationId",
    description: "Filter by location",
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: "Hourly sales report retrieved successfully",
  })
  getHourlySalesReport(
    @TenantClient() tenantClient: PrismaClient,
    @Query("date") date?: string,
    @Query("locationId") locationId?: string,
  ) {
    return this.posService.getHourlySalesReport(tenantClient, date, locationId);
  }

  // Held Invoice Endpoints
  @Post("hold-invoice")
  @RequirePermission("pos.create_sale")
  @ApiOperation({ summary: "Hold an invoice (save for later)" })
  @ApiResponse({ status: 201, description: "Invoice held successfully" })
  @ApiResponse({ status: 400, description: "Bad request - validation failed" })
  @ApiResponse({ status: 404, description: "Location or customer not found" })
  holdInvoice(
    @TenantClient() tenantClient: PrismaClient,
    @Body() holdInvoiceDto: HoldInvoiceDto,
    @Request() req,
  ) {
    return this.posService.holdInvoice(tenantClient, holdInvoiceDto, req.user.id);
  }

  @Get("held-invoices")
  @RequirePermission("pos.create_sale")
  @ApiOperation({ summary: "Get all held invoices" })
  @ApiQuery({
    name: "locationId",
    description: "Filter by location",
    required: false,
  })
  @ApiResponse({
    status: 200,
    description: "Held invoices retrieved successfully",
  })
  getHeldInvoices(
    @TenantClient() tenantClient: PrismaClient,
    @Query("locationId") locationId?: string,
  ) {
    return this.posService.getHeldInvoices(tenantClient, locationId);
  }

  @Get("held-invoices/:id")
  @RequirePermission("pos.create_sale")
  @ApiOperation({ summary: "Get a specific held invoice by ID" })
  @ApiResponse({
    status: 200,
    description: "Held invoice retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Held invoice not found" })
  getHeldInvoiceById(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.posService.getHeldInvoiceById(tenantClient, id);
  }

  @Post("held-invoices/:id/restore")
  @RequirePermission("pos.create_sale")
  @ApiOperation({ summary: "Restore a held invoice to cart" })
  @ApiResponse({
    status: 200,
    description: "Held invoice restored successfully",
  })
  @ApiResponse({ status: 400, description: "Held invoice already restored" })
  @ApiResponse({ status: 404, description: "Held invoice not found" })
  restoreHeldInvoice(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Request() req,
  ) {
    return this.posService.restoreHeldInvoice(tenantClient, id, req.user.id);
  }

  @Delete("held-invoices/:id")
  @RequirePermission("pos.create_sale")
  @ApiOperation({ summary: "Delete a held invoice" })
  @ApiResponse({
    status: 200,
    description: "Held invoice deleted successfully",
  })
  @ApiResponse({ status: 400, description: "Cannot delete restored invoice" })
  @ApiResponse({ status: 404, description: "Held invoice not found" })
  deleteHeldInvoice(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.posService.deleteHeldInvoice(tenantClient, id);
  }
}
