import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../../users/guards/permissions.guard";
import { RequirePermission } from "../../../users/decorators/permissions.decorator";
import { CreateInvoiceDto } from "../dto/create-invoice.dto";
import { InvoiceService } from "../services/invoice.service";

@ApiTags("Accounts Receivable - Invoices")
@Controller(["financial/ar/invoices", "ar/invoices"])
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ArInvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post()
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Create customer invoice" })
  @ApiResponse({ status: 201, description: "Invoice created successfully" })
  create(@Body() dto: CreateInvoiceDto) {
    return this.invoiceService.createInvoice(dto);
  }

  @Get()
  @RequirePermission("finance.view")
  @ApiOperation({ summary: "List customer invoices" })
  findAll() {
    return this.invoiceService.findAll();
  }

  @Get(":id")
  @RequirePermission("finance.view")
  @ApiOperation({ summary: "Get invoice by ID" })
  findOne(@Param("id") id: string) {
    return this.invoiceService.findOne(id);
  }

  @Patch(":id")
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Update invoice fields" })
  update(
    @Param("id") id: string,
    @Body()
    dto: Partial<{
      dueDate: Date;
      status: string;
    }>,
  ) {
    return this.invoiceService.update(id, dto);
  }

  @Delete(":id")
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Delete invoice (soft delete)" })
  remove(@Param("id") id: string) {
    return this.invoiceService.remove(id);
  }
}
