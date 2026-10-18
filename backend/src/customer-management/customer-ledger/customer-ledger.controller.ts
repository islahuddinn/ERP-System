import { Controller, Get, Param, ParseUUIDPipe, Query, Res, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Response } from "express";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { CustomerLedgerService } from "./customer-ledger.service";
import { CustomerLedgerFiltersDto } from "./dto/customer-ledger-filters.dto";

@ApiTags("Customer Management - Customer Ledger")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("customers")
export class CustomerLedgerController {
  constructor(private readonly customerLedgerService: CustomerLedgerService) {}

  @Get(":customerId/ledger")
  @RequirePermission("customer-ledger.view")
  @ApiOperation({ summary: "Get a shop's ledger with running balance, paginated" })
  getCustomerLedger(
    @Param("customerId", ParseUUIDPipe) customerId: string,
    @Query() customerLedgerFiltersDto: CustomerLedgerFiltersDto,
  ) {
    return this.customerLedgerService.getCustomerLedger(customerId, customerLedgerFiltersDto);
  }

  @Get(":customerId/ledger/export/csv")
  @RequirePermission("customer-ledger.view")
  @ApiOperation({ summary: "Export a shop's full ledger history to CSV" })
  async exportCsv(
    @Param("customerId", ParseUUIDPipe) customerId: string,
    @Query() customerLedgerFiltersDto: CustomerLedgerFiltersDto,
    @Res() res: Response,
  ) {
    const csvData = await this.customerLedgerService.exportToCsv(
      customerId,
      customerLedgerFiltersDto,
    );
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=customer-${customerId}-ledger.csv`);
    res.send(csvData);
  }
}
