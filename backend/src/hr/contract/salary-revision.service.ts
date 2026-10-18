import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  ContractStatus,
  SalaryFrequency,
  SalaryRevision,
  SalaryRevisionStatus,
} from "@prisma/tenant-client";
import { SalaryRevisionRepository } from "./salary-revision.repository";
import { ContractService } from "./contract.service";
import { CreateSalaryRevisionDto } from "./dto/create-salary-revision.dto";

@Injectable()
export class SalaryRevisionService {
  constructor(
    private readonly salaryRevisionRepository: SalaryRevisionRepository,
    private readonly contractService: ContractService,
  ) {}

  async listRevisions(contractId: string): Promise<SalaryRevision[]> {
    await this.contractService.checkExistence(contractId);

    return this.salaryRevisionRepository.findAllByContract(contractId);
  }

  async createRevision(
    contractId: string,
    createSalaryRevisionDto: CreateSalaryRevisionDto,
    createdById: string,
  ): Promise<SalaryRevision> {
    const contract = await this.contractService.checkExistence(contractId);

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException("Salary revisions can only be added to an ACTIVE contract");
    }

    const existingDraft = await this.salaryRevisionRepository.findDraftByContract(contractId);
    if (existingDraft) {
      throw new BadRequestException(
        "A pending salary revision already exists. Activate or delete it before creating a new one.",
      );
    }

    if (!createSalaryRevisionDto.effectiveDate) {
      throw new BadRequestException("effectiveDate is required when creating a salary revision");
    }

    const { baseSalary, currency, salaryFrequency, effectiveDate, reason } =
      createSalaryRevisionDto;

    if (Number(baseSalary) <= 0) {
      throw new BadRequestException("Salary must be greater than 0");
    }

    // The revision's effective date must fall inside the contract period.
    const effective = new Date(effectiveDate);
    if (effective < contract.startDate) {
      throw new BadRequestException(
        "Effective date cannot be before the contract start date",
      );
    }
    if (effective > contract.endDate) {
      throw new BadRequestException("Effective date cannot be after the contract end date");
    }

    // Always create as DRAFT — HR activates explicitly via the activate endpoint
    return this.salaryRevisionRepository.create({
      contractId,
      effectiveDate: new Date(effectiveDate),
      baseSalary,
      currency: currency ?? "PKR",
      salaryFrequency: salaryFrequency ?? SalaryFrequency.MONTHLY,
      status: SalaryRevisionStatus.DRAFT,
      reason: reason ?? null,
      createdById,
    });
  }

  async activateRevision(contractId: string, revisionId: string): Promise<SalaryRevision> {
    const contract = await this.contractService.checkExistence(contractId);

    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException("Salary revisions can only be activated on an ACTIVE contract");
    }

    const revision = await this.salaryRevisionRepository.findDraftById(revisionId);

    if (!revision || revision?.contractId !== contractId) {
      throw new NotFoundException("Pending salary revision not found for this contract");
    }

    // A future-dated revision must not become the CURRENT salary before its
    // effective date arrives — it stays a pending DRAFT until then.
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (new Date(revision.effectiveDate) > today) {
      throw new BadRequestException(
        "This salary revision cannot be activated before its effective date",
      );
    }

    return this.salaryRevisionRepository.activateRevision(contractId, revisionId);
  }

  // Used by other HR modules (e.g. loan-request) that need to validate against
  // an employee's current pay without going through a specific contractId.
  async getCurrentSalaryForEmployee(employeeId: string): Promise<SalaryRevision | null> {
    const activeContract = await this.contractService.getActiveContractForEmployee(employeeId);
    if (!activeContract) return null;

    return this.salaryRevisionRepository.findCurrentByContract(activeContract.id);
  }
}
