import { Controller, Get, Param, ParseUUIDPipe, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { RequestWithUser } from "../../common/interfaces";
import { BranchLedgerService } from "./branch-ledger.service";
import { BranchLedgerFiltersDto } from "./dto/branch-ledger-filters.dto";

@ApiTags("Sales Management - Branch Ledger")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("sales-management/branch-ledger")
export class BranchLedgerController {
  constructor(private readonly branchLedgerService: BranchLedgerService) {}

  @Get()
  @RequirePermission(
    "branch-ledger.view",
    "branch-stock-operations.view",
    "branch-stock-operations.manage",
  )
  @ApiOperation({
    summary:
      "My branch's ledger — itself and, in FIXED_PRICE mode, every descendant branch below it",
  })
  listMyBranchLedger(
    @Query() branchLedgerFiltersDto: BranchLedgerFiltersDto,
    @Req() req: RequestWithUser,
  ) {
    return this.branchLedgerService.listMyBranchLedger(branchLedgerFiltersDto, req);
  }

  @Get("summary")
  @RequirePermission(
    "branch-ledger.view",
    "branch-stock-operations.view",
    "branch-stock-operations.manage",
  )
  @ApiOperation({
    summary: "My branch's outstanding balances and profit/loss — never visible to anyone else",
  })
  getMyBranchLedgerSummary(@Req() req: RequestWithUser) {
    return this.branchLedgerService.getMyBranchLedgerSummary(req);
  }

  @Get("my-debts")
  @RequirePermission(
    "branch-ledger.view",
    "branch-stock-operations.view",
    "branch-stock-operations.manage",
  )
  @ApiOperation({
    summary:
      "Who I personally owe (as a branch's current distributor) and who owes me (as the dispatcher of a transfer) — computed from BranchLedger and BranchStockTransfer, nothing stored",
  })
  getMyDebts(@Req() req: RequestWithUser) {
    return this.branchLedgerService.getMyDebts(req);
  }

  @Get("employee-debts/:employeeId")
  @RequirePermission("branch-ledger.view", "branch-ledger.view-all")
  @ApiOperation({
    summary:
      "A specific employee's stock-transfer debts — same shape as my-debts. Requires branch-ledger.view-all unless employeeId is your own",
  })
  getEmployeeDebts(
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @Req() req: RequestWithUser,
  ) {
    return this.branchLedgerService.getEmployeeDebts(employeeId, req);
  }
}
