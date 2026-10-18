import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AuditModule, AuditAction } from "@prisma/tenant-client";
import { SalesService } from "./sales.service";
import { CreateCustomerSaleDto } from "./dto/create-sale.dto";
import { UpdateSaleDto } from "./dto/update-sale.dto";
import { UpdatePaymentDto } from "./dto/update-payment.dto";
import { SaleQueryDto } from "./dto/sale-query.dto";
import { RecordPaymentDto } from "./dto/record-payment.dto";
import { CreateCustomerSaleReturnDto } from "./dto/create-sale-return.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { Auditable } from "../audit/decorators/auditable.decorator";
import { RequestWithUser } from "../common/interfaces";

@ApiTags("Sales")
@Controller("sales")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  @RequirePermission("sales.create")
  @Auditable({ module: AuditModule.SALES })
  @ApiOperation({ summary: "Create a new sale in DRAFT status" })
  create(@Body() dto: CreateCustomerSaleDto, @Req() req: RequestWithUser) {
    return this.salesService.create(dto, req.user.id);
  }

  @Get()
  @RequirePermission("sales.read")
  @ApiOperation({ summary: "Get all sales with pagination and filters" })
  findAll(@Query() dto: SaleQueryDto) {
    return this.salesService.findAll(dto);
  }

  @Get(":saleId")
  @RequirePermission("sales.read")
  @ApiOperation({ summary: "Get sale by ID with full details" })
  findOne(@Param("saleId") saleId: string) {
    return this.salesService.findOne(saleId);
  }

  @Patch(":saleId")
  @RequirePermission("sales.update")
  @Auditable({ module: AuditModule.SALES, action: AuditAction.UPDATE })
  @ApiOperation({
    summary:
      "Update a sale. DRAFT: items (full replacement + recalculate) and/or metadata. COMPLETED: notes only.",
  })
  update(@Param("saleId") saleId: string, @Body() dto: UpdateSaleDto) {
    return this.salesService.updateSale(saleId, dto);
  }

  @Post(":saleId/confirm")
  @RequirePermission("sales.update")
  @Auditable({ module: AuditModule.SALES, action: AuditAction.APPROVE })
  @ApiOperation({
    summary: "Confirm a DRAFT sale — deducts stock (FIFO) and creates customer ledger entry",
  })
  confirm(@Param("saleId") saleId: string, @Req() req: RequestWithUser) {
    return this.salesService.confirmSale(saleId, req.user.id);
  }

  @Post(":saleId/cancel")
  @RequirePermission("sales.update")
  @Auditable({ module: AuditModule.SALES, action: AuditAction.UPDATE })
  @ApiOperation({
    summary: "Cancel a DRAFT sale — no stock reversal needed (DRAFT never touched stock)",
  })
  cancel(@Param("saleId") saleId: string, @Body() body: { notes?: string }) {
    return this.salesService.cancelSale(saleId, body.notes);
  }

  @Post(":saleId/payments")
  @RequirePermission("sales.update")
  @Auditable({ module: AuditModule.SALES, action: AuditAction.UPDATE })
  @ApiOperation({ summary: "Record a payment against a confirmed sale" })
  recordPayment(
    @Param("saleId") saleId: string,
    @Body() dto: RecordPaymentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.salesService.recordPayment(saleId, dto, req.user.id);
  }

  @Patch(":saleId/payments/:paymentId")
  @RequirePermission("sales.update")
  @Auditable({ module: AuditModule.SALES, action: AuditAction.UPDATE })
  @ApiOperation({
    summary:
      "Update an existing payment. Amount changes adjust sale.amountPaid and customer balance via an ADJUSTMENT ledger entry.",
  })
  updatePayment(
    @Param("saleId") saleId: string,
    @Param("paymentId") paymentId: string,
    @Body() dto: UpdatePaymentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.salesService.updatePayment(saleId, paymentId, dto, req.user.id);
  }

  @Post(":saleId/returns")
  @RequirePermission("sales.update")
  @Auditable({ module: AuditModule.SALE_RETURNS })
  @ApiOperation({
    summary:
      "Create a return for a confirmed sale — restores stock (LIFO batch) and credits customer ledger",
  })
  createReturn(
    @Param("saleId") saleId: string,
    @Body() dto: CreateCustomerSaleReturnDto,
    @Req() req: RequestWithUser,
  ) {
    return this.salesService.createReturn(saleId, dto, req.user.id);
  }
}
