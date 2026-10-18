import {
  Body,
  Controller,
  Delete,
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
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { Auditable } from "../../audit/decorators/auditable.decorator";
import { RequestWithUser } from "../../common/interfaces";
import { LoanRequestService } from "./loan-request.service";
import { CreateLoanRequestDto } from "./dto/create-loan-request.dto";
import { UpdateLoanRequestDto } from "./dto/update-loan-request.dto";
import { DecideLoanApprovalDto } from "./dto/decide-loan-approval.dto";
import { LoanRequestFiltersDto } from "./dto/loan-request-filters.dto";

@ApiTags("HR - Loan Requests")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("hr/loan-requests")
export class LoanRequestController {
  constructor(private readonly loanRequestService: LoanRequestService) {}

  @Get()
  @RequirePermission("loan-requests.view")
  @ApiOperation({ summary: "List all loan requests with pagination and optional filters" })
  findAll(@Query() loanRequestFiltersDto: LoanRequestFiltersDto) {
    return this.loanRequestService.findAll(loanRequestFiltersDto);
  }

  @Get(":loanRequestId")
  @RequirePermission("loan-requests.view")
  @ApiOperation({ summary: "Get a single loan request by ID" })
  findOne(@Param("loanRequestId", ParseUUIDPipe) loanRequestId: string) {
    return this.loanRequestService.findOne(loanRequestId);
  }

  @Post()
  @RequirePermission("loan-requests.create", "loan-requests.manage")
  @ApiOperation({
    summary:
      "Create a loan request for an employee — requires at least one approver; installments are only generated once every approver has approved",
  })
  @Auditable({ module: AuditModule.HR_LOAN_REQUESTS })
  createLoanRequest(
    @Body() createLoanRequestDto: CreateLoanRequestDto,
    @Req() req: RequestWithUser,
  ) {
    return this.loanRequestService.create(createLoanRequestDto, req.user.id);
  }

  @Patch(":loanRequestId")
  @RequirePermission("loan-requests.update", "loan-requests.manage")
  @ApiOperation({
    summary:
      "Update a loan request — only its creator can update it, and only while it is pending and no approver has decided yet",
  })
  @Auditable({ module: AuditModule.HR_LOAN_REQUESTS, action: AuditAction.UPDATE })
  updateLoanRequest(
    @Param("loanRequestId", ParseUUIDPipe) loanRequestId: string,
    @Body() updateLoanRequestDto: UpdateLoanRequestDto,
    @Req() req: RequestWithUser,
  ) {
    return this.loanRequestService.update(loanRequestId, updateLoanRequestDto, req.user.id);
  }

  @Delete(":loanRequestId")
  @RequirePermission("loan-requests.delete", "loan-requests.manage")
  @ApiOperation({
    summary:
      "Delete a loan request — only its creator can delete it, and only while it is pending and no approver has decided yet",
  })
  @Auditable({ module: AuditModule.HR_LOAN_REQUESTS, action: AuditAction.DELETE })
  async deleteLoanRequest(
    @Param("loanRequestId", ParseUUIDPipe) loanRequestId: string,
    @Req() req: RequestWithUser,
  ) {
    await this.loanRequestService.delete(loanRequestId, req.user.id);
    return { message: "Loan request deleted successfully" };
  }

  @Post(":loanRequestId/approve")
  @RequirePermission("loan-requests.approve")
  @ApiOperation({
    summary:
      "Record the logged-in user's approval/rejection decision for a loan request; once every assigned approver approves, the request is confirmed and its repayment installments are generated",
  })
  @Auditable({ module: AuditModule.HR_LOAN_REQUESTS, action: AuditAction.APPROVE })
  decideApproval(
    @Param("loanRequestId", ParseUUIDPipe) loanRequestId: string,
    @Body() decideLoanApprovalDto: DecideLoanApprovalDto,
    @Req() req: RequestWithUser,
  ) {
    return this.loanRequestService.decideApproval(
      loanRequestId,
      decideLoanApprovalDto,
      req.user.id,
    );
  }

  @Post(":loanRequestId/installments/:loanInstallmentId/pay")
  @RequirePermission("loan-requests.manage")
  @ApiOperation({
    summary:
      "Mark a single installment as paid — adds its amount to the loan's paid total and closes the loan once every installment is paid. The payroll module already calls this automatically when a payroll with a matching deduction is marked PAID; this route is for manual correction",
  })
  @Auditable({ module: AuditModule.HR_LOAN_REQUESTS, action: AuditAction.UPDATE })
  payInstallment(
    @Param("loanRequestId", ParseUUIDPipe) loanRequestId: string,
    @Param("loanInstallmentId", ParseUUIDPipe) loanInstallmentId: string,
  ) {
    return this.loanRequestService.payInstallment(loanRequestId, loanInstallmentId);
  }
}
