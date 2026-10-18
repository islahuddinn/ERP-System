import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { ContractAllowance, ContractStatus } from "@prisma/tenant-client";
import { handlePrismaUniqueError } from "../../common/reuseable-functions/handlePrismaUniqueError";
import { AuditContextService } from "../../audit/audit-context.service";
import { AllowanceRepository } from "./allowance.repository";
import { ContractService } from "./contract.service";
import { ContractDetail } from "./utils/types";
import { CreateContractAllowanceDto } from "./dto/create-contract-allowance.dto";
import { UpdateContractAllowanceDto } from "./dto/update-contract-allowance.dto";

@Injectable()
export class AllowanceService {
  constructor(
    private readonly allowanceRepository: AllowanceRepository,
    private readonly contractService: ContractService,
    private readonly auditContext: AuditContextService,
  ) {}

  async listAllowances(contractId: string): Promise<ContractAllowance[]> {
    await this.contractService.checkExistence(contractId);

    return this.allowanceRepository.findAllByContract(contractId);
  }

  async createAllowance(
    contractId: string,
    createContractAllowanceDto: CreateContractAllowanceDto,
    createdById: string,
  ): Promise<ContractAllowance> {
    const contract = await this.contractService.checkExistence(contractId);
    this.ensureContractIsActive(contract);

    const { allowanceType, amount } = createContractAllowanceDto;

    this.ensureAmountIsPositive(amount);

    try {
      return await this.allowanceRepository.create({
        contractId,
        allowanceType,
        amount,
        createdById,
      });
    } catch (error) {
      handlePrismaUniqueError(error, "This allowance type already exists on the contract");
    }
  }

  async updateAllowance(
    contractId: string,
    allowanceId: string,
    updateContractAllowanceDto: UpdateContractAllowanceDto,
  ): Promise<ContractAllowance> {
    const existingAllowance = await this.checkAllowanceExistence(contractId, allowanceId);

    this.ensureAmountIsPositive(updateContractAllowanceDto.amount);

    this.auditContext.setEntityId(allowanceId);
    this.auditContext.setOldValue(existingAllowance);

    return this.allowanceRepository.update(allowanceId, updateContractAllowanceDto.amount);
  }

  async deleteAllowance(contractId: string, allowanceId: string): Promise<{ message: string }> {
    const existingAllowance = await this.checkAllowanceExistence(contractId, allowanceId);

    this.auditContext.setEntityId(allowanceId);
    this.auditContext.setOldValue(existingAllowance);

    await this.allowanceRepository.delete(allowanceId);

    return { message: "Allowance removed from contract" };
  }

  async checkAllowanceExistence(
    contractId: string,
    allowanceId: string,
  ): Promise<ContractAllowance> {
    const contract = await this.contractService.checkExistence(contractId);
    this.ensureContractIsActive(contract);

    const allowance = await this.allowanceRepository.findById(contractId, allowanceId);

    if (!allowance) {
      throw new NotFoundException("Allowance not found for this contract");
    }

    return allowance;
  }

  // ── Validation helpers ────────────────────────────────────────────────

  private ensureContractIsActive(contract: ContractDetail): void {
    if (contract.status !== ContractStatus.ACTIVE) {
      throw new BadRequestException("Allowances can only be modified on an ACTIVE contract");
    }
  }

  private ensureAmountIsPositive(amount: string): void {
    if (Number(amount) <= 0) {
      throw new BadRequestException("Allowance amount must be greater than 0");
    }
  }
}
