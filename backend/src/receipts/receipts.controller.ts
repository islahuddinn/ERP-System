import { Controller, Get, Post, Param, Body, UseGuards, Request, Res, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from "@nestjs/swagger";
import { ReceiptsService } from "./receipts.service";
import { EmailReceiptDto } from "./dto/email-receipt.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Response } from "express";
import { readFileSync } from "fs";
import { TenantClient, TenantId } from "../common/decorators/tenant-client.decorator";
import { PrismaClient } from "@prisma/tenant-client";

@ApiTags("Receipts")
@Controller("receipts")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReceiptsController {
  constructor(private readonly receiptsService: ReceiptsService) {}

  @Post("generate/:saleId")
  @ApiOperation({ summary: "Generate receipt for sale" })
  @ApiQuery({
    name: "format",
    description: "Receipt format (PDF or THERMAL)",
    required: false,
  })
  @ApiResponse({ status: 200, description: "Receipt generated successfully" })
  @ApiResponse({ status: 404, description: "Sale not found" })
  async generateReceipt(
    @TenantClient() tenantClient: PrismaClient,
    @TenantId() tenantId: string,
    @Param("saleId") saleId: string,
    @Query("format") format: "PDF" | "THERMAL" = "PDF",
    @Request() req,
  ) {
    if (format === "THERMAL") {
      return this.receiptsService.generateThermal(tenantClient, tenantId, saleId, req.user.id);
    } else {
      return this.receiptsService.generatePDF(tenantClient, tenantId, saleId, req.user.id);
    }
  }

  @Get(":receiptId/download")
  @ApiOperation({ summary: "Download PDF receipt" })
  @ApiResponse({ status: 200, description: "Receipt downloaded successfully" })
  @ApiResponse({ status: 404, description: "Receipt not found" })
  @ApiResponse({
    status: 400,
    description: "Only PDF receipts can be downloaded",
  })
  async downloadReceipt(
    @TenantClient() tenantClient: PrismaClient,
    @Param("receiptId") receiptId: string,
    @Res() res: Response,
  ) {
    const { filePath, fileName } = await this.receiptsService.downloadReceipt(
      tenantClient,
      receiptId,
    );

    const fileBuffer = readFileSync(filePath);

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Content-Length": fileBuffer.length,
    });

    res.send(fileBuffer);
  }

  @Post(":saleId/email")
  @ApiOperation({ summary: "Email receipt to customer" })
  @ApiResponse({ status: 200, description: "Receipt emailed successfully" })
  @ApiResponse({
    status: 400,
    description: "No email address available or email sending failed",
  })
  @ApiResponse({ status: 404, description: "Sale not found" })
  async emailReceipt(
    @TenantClient() tenantClient: PrismaClient,
    @TenantId() tenantId: string,
    @Param("saleId") saleId: string,
    @Body() emailReceiptDto: EmailReceiptDto,
    @Request() req,
  ) {
    return this.receiptsService.emailReceipt(
      tenantClient,
      tenantId,
      saleId,
      emailReceiptDto,
      req.user.id,
    );
  }

  @Get("sale/:saleId")
  @ApiOperation({ summary: "Get all receipts for a sale" })
  @ApiResponse({ status: 200, description: "Receipts retrieved successfully" })
  @ApiResponse({ status: 404, description: "Sale not found" })
  getReceiptsBySale(@TenantClient() tenantClient: PrismaClient, @Param("saleId") saleId: string) {
    return this.receiptsService.getReceiptsBySale(tenantClient, saleId);
  }

  @Get(":receiptId/thermal")
  @ApiOperation({ summary: "Get thermal receipt as text" })
  @ApiResponse({
    status: 200,
    description: "Thermal receipt retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "Receipt not found" })
  @ApiResponse({
    status: 400,
    description: "Only thermal receipts can be retrieved as text",
  })
  async getThermalReceipt(
    @TenantClient() tenantClient: PrismaClient,
    @TenantId() tenantId: string,
    @Param("receiptId") receiptId: string,
  ) {
    return this.receiptsService.getThermalReceipt(tenantClient, tenantId, receiptId);
  }
}
