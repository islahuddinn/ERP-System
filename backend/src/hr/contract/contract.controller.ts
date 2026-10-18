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
import { AuditModule } from "@prisma/tenant-client";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { PermissionsGuard } from "../../users/guards/permissions.guard";
import { RequirePermission } from "../../users/decorators/permissions.decorator";
import { Auditable } from "../../audit/decorators/auditable.decorator";
import { RequestWithUser } from "../../common/interfaces";
import { ContractService } from "./contract.service";
import { SalaryRevisionService } from "./salary-revision.service";
import { AllowanceService } from "./allowance.service";
import { CreateContractDto } from "./dto/create-contract.dto";
import { UpdateContractDto } from "./dto/update-contract.dto";
import { ContractFiltersDto } from "./dto/contract-filters.dto";
import { CreateSalaryRevisionDto } from "./dto/create-salary-revision.dto";
import { CreateContractAllowanceDto } from "./dto/create-contract-allowance.dto";
import { UpdateContractAllowanceDto } from "./dto/update-contract-allowance.dto";

@ApiTags("HR - Contracts")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller("hr/contracts")
export class ContractController {
  constructor(
    private readonly contractService: ContractService,
    private readonly salaryRevisionService: SalaryRevisionService,
    private readonly allowanceService: AllowanceService,
  ) {}

  // ── Contract Endpoints ────────────────────────────────────────────────

  @Get()
  @RequirePermission("hr.view")
  @ApiOperation({ summary: "List contracts with filters (employee, status, type, department)" })
  listContracts(@Query() contractFiltersDto: ContractFiltersDto) {
    return this.contractService.listContracts(contractFiltersDto);
  }

  @Get(":contractId")
  @RequirePermission("hr.view")
  @ApiOperation({
    summary: "Get full contract details including all salary revisions and allowances",
  })
  getContract(@Param("contractId", ParseUUIDPipe) contractId: string) {
    return this.contractService.getContract(contractId);
  }

  @Post()
  @RequirePermission("hr.manage_contracts")
  @ApiOperation({ summary: "Create a new employee contract in DRAFT status with initial salary" })
  @Auditable({ module: AuditModule.HR_CONTRACTS })
  createContract(@Body() createContractDto: CreateContractDto, @Req() req: RequestWithUser) {
    return this.contractService.createContract(createContractDto, req.user.id);
  }

  @Patch(":contractId")
  @RequirePermission("hr.manage_contracts")
  @ApiOperation({
    summary: "Update contract fields (position, department, dates, leave quota, notes)",
  })
  @Auditable({ module: AuditModule.HR_CONTRACTS })
  updateContract(
    @Param("contractId", ParseUUIDPipe) contractId: string,
    @Body() updateContractDto: UpdateContractDto,
  ) {
    return this.contractService.updateContract(contractId, updateContractDto);
  }

  @Patch(":contractId/activate")
  @RequirePermission("hr.manage_contracts")
  @ApiOperation({
    summary: "Activate a DRAFT contract — expires any currently active contract for the employee",
  })
  @Auditable({ module: AuditModule.HR_CONTRACTS })
  activateContract(@Param("contractId", ParseUUIDPipe) contractId: string) {
    return this.contractService.activateContract(contractId);
  }

  @Patch(":contractId/terminate")
  @RequirePermission("hr.manage_contracts")
  @ApiOperation({ summary: "Terminate an ACTIVE contract" })
  @Auditable({ module: AuditModule.HR_CONTRACTS })
  terminateContract(
    @Param("contractId", ParseUUIDPipe) contractId: string,
    @Body("notes") notes?: string,
  ) {
    return this.contractService.terminateContract(contractId, notes);
  }

  // ── Salary Revision Endpoints ─────────────────────────────────────────

  @Get(":contractId/salary-revisions")
  @RequirePermission("hr.view")
  @ApiOperation({ summary: "List all salary revisions for a contract ordered by latest first" })
  listSalaryRevisions(@Param("contractId", ParseUUIDPipe) contractId: string) {
    return this.salaryRevisionService.listRevisions(contractId);
  }

  @Post(":contractId/salary-revisions")
  @RequirePermission("hr.manage_contracts")
  @ApiOperation({
    summary:
      "Add a salary revision in DRAFT status — activate explicitly via the activate endpoint",
  })
  createSalaryRevision(
    @Param("contractId", ParseUUIDPipe) contractId: string,
    @Body() createSalaryRevisionDto: CreateSalaryRevisionDto,
    @Req() req: RequestWithUser,
  ) {
    return this.salaryRevisionService.createRevision(
      contractId,
      createSalaryRevisionDto,
      req.user.id,
    );
  }

  @Patch(":contractId/salary-revisions/:revisionId/activate")
  @RequirePermission("hr.manage_contracts")
  @ApiOperation({
    summary: "Activate a DRAFT salary revision — supersedes current and makes this one CURRENT",
  })
  activateSalaryRevision(
    @Param("contractId", ParseUUIDPipe) contractId: string,
    @Param("revisionId", ParseUUIDPipe) revisionId: string,
  ) {
    return this.salaryRevisionService.activateRevision(contractId, revisionId);
  }

  // ── Contract Allowance Endpoints ──────────────────────────────────────

  @Get(":contractId/allowances")
  @RequirePermission("hr.view")
  @ApiOperation({ summary: "List all allowances for a contract" })
  listContractAllowances(@Param("contractId", ParseUUIDPipe) contractId: string) {
    return this.allowanceService.listAllowances(contractId);
  }

  @Post(":contractId/allowances")
  @RequirePermission("hr.manage_contracts")
  @ApiOperation({ summary: "Add an allowance to a contract" })
  @Auditable({ module: AuditModule.HR_CONTRACTS })
  createContractAllowance(
    @Param("contractId", ParseUUIDPipe) contractId: string,
    @Body() createContractAllowanceDto: CreateContractAllowanceDto,
    @Req() req: RequestWithUser,
  ) {
    return this.allowanceService.createAllowance(
      contractId,
      createContractAllowanceDto,
      req.user.id,
    );
  }

  @Patch(":contractId/allowances/:allowanceId")
  @RequirePermission("hr.manage_contracts")
  @ApiOperation({ summary: "Update a contract allowance's amount" })
  @Auditable({ module: AuditModule.HR_CONTRACTS })
  updateContractAllowance(
    @Param("contractId", ParseUUIDPipe) contractId: string,
    @Param("allowanceId", ParseUUIDPipe) allowanceId: string,
    @Body() updateContractAllowanceDto: UpdateContractAllowanceDto,
  ) {
    return this.allowanceService.updateAllowance(
      contractId,
      allowanceId,
      updateContractAllowanceDto,
    );
  }

  @Delete(":contractId/allowances/:allowanceId")
  @RequirePermission("hr.manage_contracts")
  @ApiOperation({ summary: "Remove an allowance from a contract" })
  @Auditable({ module: AuditModule.HR_CONTRACTS })
  deleteContractAllowance(
    @Param("contractId", ParseUUIDPipe) contractId: string,
    @Param("allowanceId", ParseUUIDPipe) allowanceId: string,
  ) {
    return this.allowanceService.deleteAllowance(contractId, allowanceId);
  }
}
