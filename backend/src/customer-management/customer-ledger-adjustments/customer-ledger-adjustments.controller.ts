import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuditModule } from "@prisma/tenant-client";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { Auditable } from "../../audit/decorators/auditable.decorator";
import { RequestWithUser } from "../../common/interfaces";
import { CustomerLedgerAdjustmentsService } from "./customer-ledger-adjustments.service";
import { CreateCustomerLedgerAdjustmentDto } from "./dto/create-customer-ledger-adjustment.dto";
import { CustomerLedgerAdjustmentFiltersDto } from "./dto/customer-ledger-adjustment-filters.dto";

@ApiTags("Customer Management - Customer Ledger Adjustments")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("customer-management/customer-ledger-adjustments")
export class CustomerLedgerAdjustmentsController {
  constructor(
    private readonly customerLedgerAdjustmentsService: CustomerLedgerAdjustmentsService,
  ) {}

  @Get()
  @RequirePermission("customer-ledger-adjustment.view")
  @ApiOperation({ summary: "List shop credit and debit notes with pagination and filters" })
  listCustomerLedgerAdjustments(
    @Query() customerLedgerAdjustmentFiltersDto: CustomerLedgerAdjustmentFiltersDto,
  ) {
    return this.customerLedgerAdjustmentsService.listCustomerLedgerAdjustments(
      customerLedgerAdjustmentFiltersDto,
    );
  }

  @Get(":adjustmentId")
  @RequirePermission("customer-ledger-adjustment.view")
  @ApiOperation({ summary: "Get a shop credit or debit note by ID" })
  getCustomerLedgerAdjustment(@Param("adjustmentId", ParseUUIDPipe) adjustmentId: string) {
    return this.customerLedgerAdjustmentsService.getCustomerLedgerAdjustment(adjustmentId);
  }

  @Auditable({ module: AuditModule.CUSTOMER_LEDGER_ADJUSTMENTS })
  @Post()
  @RequirePermission("customer-ledger-adjustment.create")
  @ApiOperation({
    summary:
      "Post a credit note (reduces shop balance) or debit note (increases shop balance) — writes CustomerLedger ADJUSTMENT immediately",
  })
  createCustomerLedgerAdjustment(
    @Body() createCustomerLedgerAdjustmentDto: CreateCustomerLedgerAdjustmentDto,
    @Req() req: RequestWithUser,
  ) {
    return this.customerLedgerAdjustmentsService.createCustomerLedgerAdjustment(
      createCustomerLedgerAdjustmentDto,
      req,
    );
  }
}
