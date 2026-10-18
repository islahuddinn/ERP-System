import { Controller, Get, Patch, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { InvoiceSettingsService } from "./invoice-settings.service";
import { UpdateInvoiceSettingsDto } from "./dto/update-invoice-settings.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { TenantClient } from "../common/decorators/tenant-client.decorator";
import { PrismaClient } from "@prisma/tenant-client";

@ApiTags("Invoice Settings")
@Controller("invoice-settings")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class InvoiceSettingsController {
  constructor(private readonly invoiceSettingsService: InvoiceSettingsService) {}

  @Get()
  @ApiOperation({ summary: "Get current invoice settings" })
  @ApiResponse({
    status: 200,
    description: "Invoice settings retrieved successfully",
  })
  async getSettings(@TenantClient() tenantClient: PrismaClient) {
    return this.invoiceSettingsService.getSettings(tenantClient);
  }

  @Patch()
  @ApiOperation({ summary: "Update invoice settings" })
  @ApiResponse({
    status: 200,
    description: "Invoice settings updated successfully",
  })
  @ApiResponse({ status: 400, description: "Invalid input data" })
  async updateSettings(
    @TenantClient() tenantClient: PrismaClient,
    @Body() updateDto: UpdateInvoiceSettingsDto,
  ) {
    return this.invoiceSettingsService.updateSettings(tenantClient, updateDto);
  }
}
