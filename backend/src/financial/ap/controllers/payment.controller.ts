import { Controller, Get, Post, Body, Param, Delete, Patch, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../../users/guards/permissions.guard";
import { RequirePermission } from "../../../users/decorators/permissions.decorator";
import { PaymentService } from "../services/payment.service";
import { CreatePaymentDto } from "../dto/create-payment.dto";

@ApiTags("Accounts Payable - Payments")
@Controller(["financial/ap/payments", "ap/payments"])
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Create a new payment" })
  @ApiResponse({ status: 201, description: "Payment created successfully" })
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentService.createPayment(createPaymentDto);
  }

  @Get()
  @RequirePermission("finance.view")
  @ApiOperation({ summary: "Get all payments" })
  @ApiResponse({ status: 200, description: "Payments retrieved successfully" })
  findAll() {
    return this.paymentService.findAll();
  }

  @Get(":id")
  @RequirePermission("finance.view")
  @ApiOperation({ summary: "Get payment by ID" })
  @ApiResponse({ status: 200, description: "Payment retrieved successfully" })
  findOne(@Param("id") id: string) {
    return this.paymentService.findOne(id);
  }

  @Delete(":id")
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Delete payment" })
  @ApiResponse({ status: 200, description: "Payment deleted successfully" })
  remove(@Param("id") id: string) {
    return this.paymentService.remove(id);
  }

  @Patch(":id")
  @RequirePermission("finance.manage")
  @ApiOperation({ summary: "Update payment fields" })
  @ApiResponse({ status: 200, description: "Payment updated successfully" })
  update(@Param("id") id: string, @Body() dto: Partial<{ paymentDate: Date; method: string }>) {
    return this.paymentService.update(id, dto);
  }
}
