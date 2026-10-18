import { Controller, Get, Param, ParseUUIDPipe, Query, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { RequestWithUser } from "../common/interfaces";
import { EmployeeCashLedgerService } from "./employee-cash-ledger.service";
import { EmployeeCashLedgerFiltersDto } from "./dto/employee-cash-ledger-filters.dto";

@ApiTags("Employee Cash Ledger")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("employee-cash-ledger")
export class EmployeeCashLedgerController {
  constructor(private readonly employeeCashLedgerService: EmployeeCashLedgerService) {}

  @Get(":employeeId")
  @RequirePermission("employee-cash-ledger.view", "employee-cash-ledger.view-all")
  @ApiOperation({
    summary:
      "Get an employee's cash ledger and current cash-in-hand balance. Pass withEmployeeId to narrow it to just their history with one other employee. Without employee-cash-ledger.view-all, employeeId must be your own",
  })
  getEmployeeCashLedger(
    @Param("employeeId", ParseUUIDPipe) employeeId: string,
    @Query() employeeCashLedgerFiltersDto: EmployeeCashLedgerFiltersDto,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeCashLedgerService.getEmployeeCashLedger(
      employeeId,
      employeeCashLedgerFiltersDto,
      req,
    );
  }
}
