import { Controller, Get, Post, Body, Param, UseGuards, Request } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiSecurity,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient } from "@prisma/tenant-client";
import { InvoicesService } from "./invoices.service";

@ApiTags("Invoices")
@Controller("invoices")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
@ApiSecurity("X-Tenant-Id")
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get(":id")
  @RequirePermission("sales.read")
  @ApiOperation({ summary: "Get invoice details" })
  @ApiResponse({ status: 200, description: "Invoice found" })
  @ApiResponse({ status: 404, description: "Invoice not found" })
  @ApiParam({ name: "id", type: String })
  async getInvoice(@TenantClient() tenantClient: PrismaClient, @Param("id") id: string) {
    return this.invoicesService.findOne(tenantClient, id);
  }

  @Post(":id/payment")
  @RequirePermission("pos.process_payment")
  @ApiOperation({ summary: "Record payment for invoice" })
  @ApiResponse({ status: 200, description: "Payment recorded successfully" })
  @ApiResponse({ status: 404, description: "Invoice not found" })
  @ApiResponse({ status: 400, description: "Invalid payment amount" })
  @ApiParam({ name: "id", type: String })
  async recordPayment(
    @TenantClient() tenantClient: PrismaClient,
    @Param("id") id: string,
    @Body() body: { amount: number; paymentMethod: string },
    @Request() req,
  ) {
    const invoice = await this.invoicesService.recordPayment(
      tenantClient,
      id,
      body.amount,
      body.paymentMethod,
      req.user.id,
    );

    return {
      success: true,
      message: `Payment recorded successfully`,
      data: invoice,
    };
  }
}
