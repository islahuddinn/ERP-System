import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { SupplierLedgerService } from "./ledger.service";
import { LedgerQueryDto } from "./dto/ledger-query.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";

@ApiTags("Supplier Ledger")
@Controller("suppliers")
@UseGuards(JwtAuthGuard, PermissionsGuard)
@ApiBearerAuth()
export class SupplierLedgerController {
  constructor(private readonly ledgerService: SupplierLedgerService) {}

  @Get("ledger-overview")
  @RequirePermission("suppliers.read")
  @ApiOperation({ summary: "Get balance overview for all active suppliers" })
  @ApiQuery({ name: "search", required: false })
  getLedgerOverview(@Query("search") search?: string) {
    return this.ledgerService.getLedgerOverview(search);
  }

  @Get(":id/ledger")
  @RequirePermission("suppliers.read")
  @ApiOperation({ summary: "Get full chronological ledger for a supplier with running balance" })
  getSupplierLedger(@Param("id") id: string, @Query() queryDto: LedgerQueryDto) {
    return this.ledgerService.getSupplierLedger(id, queryDto);
  }
}
