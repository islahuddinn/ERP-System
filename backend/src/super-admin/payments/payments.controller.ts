import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";

import { SuperAdminJwtAuthGuard } from "../auth/guards/super-admin-jwt-auth.guard";

import { PaymentsService } from "./payments.service";

import { CreateSubscriptionPaymentDto } from "./dto/create-payment.dto";
import { PaymentFiltersDto } from "./dto/payment-filters.dto";
import { MarkPaymentAsPaidDto } from "./dto/mark-payment-as-paid.dto";
import { MarkPaymentAsFailedDto } from "./dto/mark-payment-as-failed.dto";
import { CancelPaymentDto } from "./dto/cancel-payment.dto";
import { RefundPaymentDto } from "./dto/refund-payment.dto";

@ApiTags("Super Admin - Payments")
@Controller("super-admin/payments")
@UseGuards(SuperAdminJwtAuthGuard)
@ApiBearerAuth()
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: "Create a subscription payment" })
  create(@Body() dto: CreateSubscriptionPaymentDto) {
    return this.paymentsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "List subscription payments" })
  findAll(@Query() query: PaymentFiltersDto) {
    return this.paymentsService.findAll(query);
  }

  @Get("stats")
  @ApiOperation({ summary: "Get payment stats, optionally filtered by tenant" })
  getStats(@Query("tenantId") tenantId?: string) {
    return this.paymentsService.getStats(tenantId);
  }

  @Get(":paymentId")
  @ApiOperation({ summary: "Get a subscription payment by ID" })
  findOne(@Param("paymentId") paymentId: string) {
    return this.paymentsService.findOne(paymentId);
  }

  @Patch(":paymentId/mark-paid")
  @ApiOperation({ summary: "Mark a pending payment as paid" })
  markAsPaid(@Param("paymentId") paymentId: string, @Body() dto: MarkPaymentAsPaidDto) {
    return this.paymentsService.markAsPaid(paymentId, dto);
  }

  @Patch(":paymentId/mark-failed")
  @ApiOperation({ summary: "Mark a pending payment as failed" })
  markAsFailed(@Param("paymentId") paymentId: string, @Body() dto: MarkPaymentAsFailedDto) {
    return this.paymentsService.markAsFailed(paymentId, dto);
  }

  @Patch(":paymentId/cancel")
  @ApiOperation({ summary: "Cancel a pending payment" })
  cancel(@Param("paymentId") paymentId: string, @Body() dto: CancelPaymentDto) {
    return this.paymentsService.cancel(paymentId, dto);
  }

  @Patch(":paymentId/refund")
  @ApiOperation({ summary: "Refund a paid payment" })
  refund(@Param("paymentId") paymentId: string, @Body() dto: RefundPaymentDto) {
    return this.paymentsService.refund(paymentId, dto);
  }

  @Post(":paymentId/retry")
  @ApiOperation({ summary: "Retry a failed payment by creating a new attempt" })
  retry(@Param("paymentId") paymentId: string) {
    return this.paymentsService.retry(paymentId);
  }
}
