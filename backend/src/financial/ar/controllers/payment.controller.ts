import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../../users/guards/permissions.guard";
import { RequirePermission } from "../../../users/decorators/permissions.decorator";
import { CreatePaymentDto } from "../dto/create-payment.dto";
import { PaymentService } from "../services/payment.service";

@ApiTags("Accounts Receivable - Payments")
@Controller(["financial/ar/payments", "ar/payments"])
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class ArPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Create customer payment" })
  @ApiResponse({ status: 201, description: "Payment created successfully" })
  create(@Body() dto: CreatePaymentDto) {
    return this.paymentService.createPayment(dto);
  }

  @Get()
  @RequirePermission("finance.view")
  @ApiOperation({ summary: "List customer payments" })
  findAll() {
    return this.paymentService.findAll();
  }

  @Get(":id")
  @RequirePermission("finance.view")
  @ApiOperation({ summary: "Get payment by ID" })
  findOne(@Param("id") id: string) {
    return this.paymentService.findOne(id);
  }

  @Delete(":id")
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Delete payment (soft delete)" })
  remove(@Param("id") id: string) {
    return this.paymentService.remove(id);
  }

  @Patch(":id")
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Update payment fields" })
  update(
    @Param("id") id: string,
    @Body() dto: Partial<{ paymentDate: Date; method: string }>,
  ) {
    return this.paymentService.update(id, dto);
  }
}
