import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  ContractStatus,
  EmployeeContract,
  Prisma,
  SalaryFrequency,
  SalaryRevisionStatus,
} from "@prisma/tenant-client";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { AuditContextService } from "../../audit/audit-context.service";
import { ContractRepository } from "./contract.repository";
import { ContractDetail, ContractListItem } from "./utils/types";
import { CreateContractDto } from "./dto/create-contract.dto";
import { UpdateContractDto } from "./dto/update-contract.dto";
import { ContractFiltersDto } from "./dto/contract-filters.dto";
import { validateDateRange } from "./utils/validate-date-range";
import { serializeDecimalsDeep } from "./utils/serialize-decimals";

@Injectable()
export class ContractService {
  constructor(
    private readonly contractRepository: ContractRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async listContracts(
    contractFiltersDto: ContractFiltersDto,
  ): Promise<PaginatedResponse<ContractListItem>> {
    return this.contractRepository.findAll(contractFiltersDto);
  }

  async getContract(contractId: string): Promise<ContractDetail> {
    return this.checkExistence(contractId);
  }

  async createContract(
    createContractDto: CreateContractDto,
    createdById: string,
  ): Promise<ContractDetail> {
    const {
      employeeId,
      positionId,
      departmentId,
      contractType,
      startDate,
      endDate,
      probationEndDate,
      totalLeaves,
      salary,
      notes,
    } = createContractDto;

    const { effectiveDate, baseSalary, currency, salaryFrequency, reason } = salary;

    validateDateRange(startDate, endDate);

    if (Number(baseSalary) <= 0) {
      throw new BadRequestException("Salary must be greater than 0");
    }

    this.validateProbationEndDate(probationEndDate, startDate, endDate);

    // When provided, the initial salary's effective date must fall within the
    // contract period — a revision cannot take effect before it starts or after
    // it ends.
    if (effectiveDate) {
      this.validateEffectiveDateWithinContract(effectiveDate, startDate, endDate);
    }

    const contractPayload: Prisma.EmployeeContractUncheckedCreateInput = {
      employeeId,
      positionId: positionId ?? null,
      departmentId: departmentId ?? null,
      contractType,
      status: ContractStatus.DRAFT,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      probationEndDate: probationEndDate ? new Date(probationEndDate) : null,
      totalLeaves,
      consumedLeaves: 0,
      notes: notes ?? null,
      createdById,
    };

    const salaryRevisionPayload: Omit<Prisma.SalaryRevisionUncheckedCreateInput, "contractId"> = {
      effectiveDate: effectiveDate ? new Date(effectiveDate) : new Date(startDate),
      baseSalary,
      currency: currency ?? "PKR",
      salaryFrequency: salaryFrequency ?? SalaryFrequency.MONTHLY,
      status: SalaryRevisionStatus.DRAFT,
      reason: reason ?? null,
      createdById,
    };

    return this.contractRepository.createWithRevision(contractPayload, salaryRevisionPayload);
  }

  async updateContract(
    contractId: string,
    updateContractDto: UpdateContractDto,
  ): Promise<ContractDetail> {
    const contract = await this.checkExistence(contractId);

    if (
      contract.status === ContractStatus.TERMINATED ||
      contract.status === ContractStatus.EXPIRED
    ) {
      throw new BadRequestException(`Cannot update a ${contract.status.toLowerCase()} contract`);
    }

    const { positionId, departmentId, startDate, endDate, probationEndDate, totalLeaves, notes } =
      updateContractDto;

    /**
     * Validate Start & End Dates
     */
    const resolvedStart = startDate ? new Date(startDate) : contract.startDate;
    const resolvedEnd = endDate ? new Date(endDate) : contract.endDate;

    validateDateRange(resolvedStart, resolvedEnd);

    // Resolve the probation date being validated against — the incoming value if
    // supplied, otherwise the one already stored — so an updated start/end date
    // is still checked against the existing probation date.
    const resolvedProbation =
      probationEndDate !== undefined
        ? probationEndDate
          ? new Date(probationEndDate)
          : null
        : contract.probationEndDate;

    this.validateProbationEndDate(resolvedProbation, resolvedStart, resolvedEnd);

    const updatePayload: Prisma.EmployeeContractUncheckedUpdateInput = {
      ...(positionId !== undefined && { positionId }),
      ...(departmentId !== undefined && { departmentId }),
      ...(startDate !== undefined && { startDate: new Date(startDate) }),
      ...(endDate !== undefined && { endDate: new Date(endDate) }),
      ...(probationEndDate !== undefined && { probationEndDate: new Date(probationEndDate) }),
      ...(totalLeaves !== undefined && { totalLeaves }),
      ...(notes !== undefined && { notes }),
    };

    // Snapshot the pre-update contract in the same serialized shape as the HTTP
    // response (Decimals → numbers) so the audit diff only surfaces the fields
    // that actually changed — not Decimal-vs-number representation noise.
    this.auditContext.setOldValue(serializeDecimalsDeep(contract));

    return this.contractRepository.update(contractId, updatePayload);
  }

  async activateContract(contractId: string): Promise<ContractDetail> {
    const contract = await this.checkExistence(contractId);

    if (contract.status !== ContractStatus.DRAFT) {
      throw new BadRequestException("Only a DRAFT contract can be activated");
    }

    const currentActive = await this.contractRepository.findActiveByEmployee(contract.employeeId);

    this.auditContext.setOldValue(serializeDecimalsDeep(contract));

    return this.contractRepository.activateContract(contractId, currentActive ?? undefined);
  }

  async terminateContract(contractId: string, notes?: string): Promise<ContractDetail> {
    const contract = await this.checkExistence(contractId);

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException("Only an ACTIVE contract can be terminated");
    }

    this.auditContext.setOldValue(serializeDecimalsDeep(contract));

    return this.contractRepository.terminate(contractId, notes);
  }

  // Used by other HR modules (e.g. loan-request) that need the employee's active
  // contract but not the full ContractDetail include shape.
  async getActiveContractForEmployee(employeeId: string): Promise<EmployeeContract | null> {
    return this.contractRepository.findActiveByEmployee(employeeId);
  }

  // ── Validation helpers ────────────────────────────────────────────────

  private validateProbationEndDate(
    probationEndDate: string | Date | null | undefined,
    startDate: string | Date,
    endDate: string | Date | null | undefined,
  ): void {
    if (!probationEndDate) return;

    const probation = new Date(probationEndDate);

    if (probation < new Date(startDate)) {
      throw new BadRequestException("probationEndDate cannot be before startDate");
    }

    // Open-ended contracts have no endDate, so there is nothing to bound against.
    if (endDate && probation >= new Date(endDate)) {
      throw new BadRequestException("probationEndDate must be before endDate");
    }
  }

  private validateEffectiveDateWithinContract(
    effectiveDate: string | Date,
    startDate: string | Date,
    endDate: string | Date,
  ): void {
    const effective = new Date(effectiveDate);

    if (effective < new Date(startDate)) {
      throw new BadRequestException("effectiveDate cannot be before the contract start date");
    }

    if (effective > new Date(endDate)) {
      throw new BadRequestException("effectiveDate cannot be after the contract end date");
    }
  }

  async checkExistence(contractId: string): Promise<ContractDetail> {
    const contract = await this.contractRepository.findById(contractId);

    if (!contract) {
      throw new NotFoundException("Contract not found");
    }

    return contract;
  }
}
