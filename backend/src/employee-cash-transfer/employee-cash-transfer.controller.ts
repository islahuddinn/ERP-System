import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuditAction, AuditModule } from "@prisma/tenant-client";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../users/guards/permissions.guard";
import { RequirePermission } from "../users/decorators/permissions.decorator";
import { Auditable } from "../audit/decorators/auditable.decorator";
import { RequestWithUser } from "../common/interfaces";
import { EmployeeCashTransferService } from "./employee-cash-transfer.service";
import { CreateEmployeeCashTransferDto } from "./dto/create-employee-cash-transfer.dto";
import { UpdateEmployeeCashTransferDto } from "./dto/update-employee-cash-transfer.dto";
import { RespondToEmployeeCashTransferDto } from "./dto/respond-to-employee-cash-transfer.dto";
import { EmployeeCashTransferFiltersDto } from "./dto/employee-cash-transfer-filters.dto";

@ApiTags("Employee Cash Transfer")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("employee-cash-transfer")
export class EmployeeCashTransferController {
  constructor(private readonly employeeCashTransferService: EmployeeCashTransferService) {}

  @Get()
  @RequirePermission("employee-cash-transfer.view")
  @ApiOperation({ summary: "List employee cash transfers with pagination and filters" })
  listEmployeeCashTransfers(
    @Query() employeeCashTransferFiltersDto: EmployeeCashTransferFiltersDto,
  ) {
    return this.employeeCashTransferService.listEmployeeCashTransfers(
      employeeCashTransferFiltersDto,
    );
  }

  @Get(":transferId")
  @RequirePermission("employee-cash-transfer.view")
  @ApiOperation({ summary: "Get an employee cash transfer by ID" })
  getEmployeeCashTransfer(@Param("transferId", ParseUUIDPipe) transferId: string) {
    return this.employeeCashTransferService.getEmployeeCashTransfer(transferId);
  }

  @Auditable({ module: AuditModule.EMPLOYEE_CASH_TRANSFERS })
  @Post()
  @RequirePermission("employee-cash-transfer.create")
  @ApiOperation({
    summary:
      "Record the logged-in employee handing cash over to another employee — stays PENDING and has no ledger effect until the recipient confirms it",
  })
  createEmployeeCashTransfer(
    @Body() createEmployeeCashTransferDto: CreateEmployeeCashTransferDto,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeCashTransferService.createEmployeeCashTransfer(
      createEmployeeCashTransferDto,
      req,
    );
  }

  @Auditable({ module: AuditModule.EMPLOYEE_CASH_TRANSFERS, action: AuditAction.UPDATE })
  @Patch(":transferId")
  @RequirePermission("employee-cash-transfer.update")
  @ApiOperation({
    summary: "Update a transfer's amount/notes — only its sender can, and only while PENDING",
  })
  updateEmployeeCashTransfer(
    @Param("transferId", ParseUUIDPipe) transferId: string,
    @Body() updateEmployeeCashTransferDto: UpdateEmployeeCashTransferDto,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeCashTransferService.updateEmployeeCashTransfer(
      transferId,
      updateEmployeeCashTransferDto,
      req,
    );
  }

  @Auditable({ module: AuditModule.EMPLOYEE_CASH_TRANSFERS, action: AuditAction.UPDATE })
  @Post(":transferId/respond")
  @RequirePermission("employee-cash-transfer.respond")
  @ApiOperation({
    summary:
      "Recipient confirms or rejects a pending transfer — confirming writes the debit/credit ledger entries, rejecting writes none",
  })
  respondToEmployeeCashTransfer(
    @Param("transferId", ParseUUIDPipe) transferId: string,
    @Body() respondToEmployeeCashTransferDto: RespondToEmployeeCashTransferDto,
    @Req() req: RequestWithUser,
  ) {
    return this.employeeCashTransferService.respondToEmployeeCashTransfer(
      transferId,
      respondToEmployeeCashTransferDto,
      req,
    );
  }
}
