import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Response } from "express";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { PurchaseOrderService } from "./purchase-order.service";
import { CreatePurchaseOrderDto } from "./dto/create-purchase-order.dto";
import { UpdatePurchaseOrderDto } from "./dto/update-purchase-order.dto";
import { PurchaseQueryDto } from "./dto/purchase-query.dto";
import { AddPaymentDto } from "./dto/add-payment.dto";
import { UpdatePaymentDto } from "./dto/update-payment.dto";
import { UpdatePoStatusDto } from "./dto/update-po-status.dto";
import { DecidePoApprovalDto } from "./dto/decide-po-approval.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { RequestWithUser } from "../common/interfaces";
import { Auditable } from "../audit/decorators/auditable.decorator";
import { AuditAction, AuditModule } from "@prisma/tenant-client";

@ApiTags("Purchases Order")
@Controller("purchase-orders")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class PurchaseOrderController {
  constructor(private readonly purchaseService: PurchaseOrderService) {}

  @Auditable({ module: AuditModule.PURCHASE_ORDERS })
  @Post()
  @RequirePermission("purchases.create")
  @ApiOperation({ summary: "Create a new purchase order with items" })
  create(@Body() dto: CreatePurchaseOrderDto, @Req() req: RequestWithUser) {
    return this.purchaseService.create(dto, req);
  }

  @Get("dropdown")
  @RequirePermission("purchases.read")
  @ApiOperation({ summary: "Dropdown list of confirmed purchase orders (for GRN selection)" })
  dropdown() {
    return this.purchaseService.dropdown();
  }

  @Get()
  @RequirePermission("purchases.read")
  @ApiOperation({ summary: "Get all purchase orders with pagination and filters" })
  findAll(@Query() queryDto: PurchaseQueryDto) {
    return this.purchaseService.findAll(queryDto);
  }

  @Get(":purchaseOrderId")
  @RequirePermission("purchases.read")
  @ApiOperation({ summary: "Get a single purchase order by ID" })
  findOne(@Param("purchaseOrderId") purchaseOrderId: string) {
    return this.purchaseService.findOne(purchaseOrderId);
  }

  @Get(":purchaseOrderId/pdf")
  @RequirePermission("purchases.read")
  @ApiOperation({ summary: "Download a single purchase order as a PDF document" })
  async downloadPdf(
    @Param("purchaseOrderId") purchaseOrderId: string,
    @Res() res: Response,
  ): Promise<void> {
    const po = await this.purchaseService.findOne(purchaseOrderId);
    const pdf = await this.purchaseService.generatePdf(purchaseOrderId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${po.orderNumber}.pdf`);
    res.send(pdf);
  }

  @Auditable({ module: AuditModule.PURCHASE_ORDERS })
  @Patch(":purchaseOrderId")
  @RequirePermission("purchases.update")
  @ApiOperation({ summary: "Update a DRAFT purchase order (header + items diff)" })
  update(
    @Param("purchaseOrderId") purchaseOrderId: string,
    @Body() dto: UpdatePurchaseOrderDto,
    @Req() req: RequestWithUser,
  ) {
    return this.purchaseService.update(purchaseOrderId, dto, req);
  }

  @Auditable({ module: AuditModule.PURCHASE_ORDERS })
  @Patch(":purchaseOrderId/status")
  @RequirePermission("purchases.update")
  @ApiOperation({
    summary:
      "Update purchase order status (DRAFT→CONFIRMED or CANCELLED; CONFIRMED/PARTIAL→RECEIVED). Cancelling is only allowed while the order is still DRAFT.",
  })
  updateStatus(
    @Param("purchaseOrderId") purchaseOrderId: string,
    @Body() dto: UpdatePoStatusDto,
    @Req() req: RequestWithUser,
  ) {
    return this.purchaseService.updateStatus(purchaseOrderId, dto.status, req);
  }

  @Auditable({ module: AuditModule.PURCHASE_ORDERS, action: AuditAction.APPROVE })
  @Post(":purchaseOrderId/approve")
  @RequirePermission("purchases.approve")
  @ApiOperation({
    summary:
      "Record the logged-in user's approval/rejection decision for a purchase order; once all assigned approvers approve, the order is auto-confirmed",
  })
  approve(
    @Param("purchaseOrderId") purchaseOrderId: string,
    @Body() dto: DecidePoApprovalDto,
    @Req() req: RequestWithUser,
  ) {
    return this.purchaseService.approve(purchaseOrderId, dto, req);
  }

  @Auditable({ module: AuditModule.PURCHASE_ORDERS })
  @Delete(":purchaseOrderId")
  @RequirePermission("purchases.delete")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a DRAFT purchase order" })
  remove(@Param("purchaseOrderId") purchaseOrderId: string, @Req() req: RequestWithUser) {
    return this.purchaseService.remove(purchaseOrderId, req);
  }

  // ── Payments Management ──────────────────────────────────────────────────────────

  @Auditable({ module: AuditModule.PURCHASE_ORDERS, action: AuditAction.UPDATE })
  @Post(":purchaseOrderId/payments")
  @RequirePermission("purchases.update")
  @ApiOperation({ summary: "Add a payment against a purchase order (supports partial payments)" })
  addPayment(
    @Param("purchaseOrderId") purchaseOrderId: string,
    @Body() dto: AddPaymentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.purchaseService.addPayment(purchaseOrderId, dto, req);
  }

  @Auditable({
    module: AuditModule.PURCHASE_ORDERS,
    entity: "PurchasePayment",
    action: AuditAction.UPDATE,
  })
  @Patch(":purchaseOrderId/payments/:paymentId")
  @RequirePermission("purchases.update")
  @ApiOperation({
    summary:
      "Update an existing payment (amount, method, reference, notes) — recalculates PO amountPaid and paymentStatus atomically",
  })
  updatePayment(
    @Param("purchaseOrderId") purchaseOrderId: string,
    @Param("paymentId") paymentId: string,
    @Body() dto: UpdatePaymentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.purchaseService.updatePayment(purchaseOrderId, paymentId, dto, req);
  }

  @Get(":purchaseOrderId/payments")
  @RequirePermission("purchases.read")
  @ApiOperation({ summary: "Get full payment history for a purchase order" })
  getPaymentHistory(@Param("purchaseOrderId") purchaseOrderId: string) {
    return this.purchaseService.getPaymentHistory(purchaseOrderId);
  }
}
