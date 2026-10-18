import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  LoanApprovalStatus,
  LoanInstallmentStatus,
  LoanRequestStatus,
  Prisma,
} from "@prisma/tenant-client";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { AuditContextService } from "../../audit/audit-context.service";
import { PermissionsService } from "../../users/permissions/permissions.service";
import { SalaryRevisionService } from "../contract/salary-revision.service";
import { HrSettingsService } from "../hr-settings/hr-settings.service";
import { LoanRequestRepository } from "./loan-request.repository";
import { CreateLoanRequestDto } from "./dto/create-loan-request.dto";
import { UpdateLoanRequestDto } from "./dto/update-loan-request.dto";
import { DecideLoanApprovalDto } from "./dto/decide-loan-approval.dto";
import { LoanRequestFiltersDto } from "./dto/loan-request-filters.dto";
import { LoanRequestDetail } from "./utils/types";
import { splitAmountIntoInstallments } from "./utils/installment-calculations";
import { getMaxAllowedInstallmentAmount } from "./utils/salary-eligibility";

interface LoanInstallmentSnapshot {
  id: string;
  loanRequestId: string;
  amount: Prisma.Decimal;
  installmentNumber: number;
}

@Injectable()
export class LoanRequestService {
  constructor(
    private readonly loanRequestRepository: LoanRequestRepository,
    private readonly permissionsService: PermissionsService,
    private readonly salaryRevisionService: SalaryRevisionService,
    private readonly hrSettingsService: HrSettingsService,
    private readonly auditContext: AuditContextService,
  ) {}

  /** ============================= CRUD =============================  */

  async findAll(
    loanRequestFiltersDto: LoanRequestFiltersDto,
  ): Promise<PaginatedResponse<LoanRequestDetail>> {
    return this.loanRequestRepository.findAll(loanRequestFiltersDto);
  }

  async findOne(loanRequestId: string): Promise<LoanRequestDetail> {
    return this.checkExistence(loanRequestId);
  }

  async create(
    createLoanRequestDto: CreateLoanRequestDto,
    userId: string,
  ): Promise<LoanRequestDetail> {
    const { employeeId, description, totalAmount, totalInstallments, approverIds } =
      createLoanRequestDto;

    const employee = await this.checkEmployeeExists(employeeId);

    /**
     * Employees requesting a loan for themselves cannot also be one of their own approvers.
     */
    this.checkApproversExcludeSelf(employee, approverIds, userId);

    /**
     * Validate that all provided approver IDs exist in the system. This prevents creating loan requests with invalid approvers.
     */
    await this.loanRequestRepository.validateApproverIds(approverIds);

    /**
     * Being listed as an approver never grants permission by itself — it only
     * records who is expected to decide. So an approver must already hold
     * "loan-requests.approve" through their role, otherwise their assigned
     * approval would sit PENDING forever with no one able to act on it.
     */
    // await this.checkApproversCanApprove(approverIds);

    /**
     * A loan installment is deducted from the employee's monthly salary, so it
     * can't be allowed to exceed the tenant-configured percentage of that salary
     * (e.g. a 10k salary can't carry a 12k installment).
     */
    await this.checkInstallmentAffordability(employeeId, totalAmount, totalInstallments);

    const payload: Prisma.LoanRequestUncheckedCreateInput = {
      employeeId,
      description: description ?? null,
      totalAmount,
      totalInstallments,
      createdById: userId,
    };

    const uniqueApproverIds = [...new Set(approverIds)];

    return this.loanRequestRepository.create(payload, uniqueApproverIds);
  }

  async delete(loanRequestId: string, userId: string): Promise<void> {
    const loanRequest = await this.checkExistence(loanRequestId);

    this.checkCreatorOwnership(loanRequest, userId, "delete");
    this.checkNoApproverHasDecidedYet(loanRequest, "delete");

    this.auditContext.setOldValue(loanRequest);

    await this.loanRequestRepository.delete(loanRequestId);
  }

  async update(
    loanRequestId: string,
    updateLoanRequestDto: UpdateLoanRequestDto,
    userId: string,
  ): Promise<LoanRequestDetail> {
    const loanRequest = await this.checkExistence(loanRequestId);

    this.checkCreatorOwnership(loanRequest, userId, "update");
    this.checkNoApproverHasDecidedYet(loanRequest, "update");

    const { description, totalAmount, totalInstallments, approverIds } = updateLoanRequestDto;

    if (approverIds) {
      const employee = await this.checkEmployeeExists(loanRequest.employeeId);

      this.checkApproversExcludeSelf(employee, approverIds, userId);

      await this.loanRequestRepository.validateApproverIds(approverIds);

      await this.checkApproversCanApprove(approverIds);
    }

    const isAffordabilityAffected = totalAmount !== undefined || totalInstallments !== undefined;

    if (isAffordabilityAffected) {
      await this.checkInstallmentAffordability(
        loanRequest.employeeId,
        totalAmount ?? loanRequest.totalAmount,
        totalInstallments ?? loanRequest.totalInstallments,
      );
    }

    const payload: Prisma.LoanRequestUncheckedUpdateInput = {
      ...(description !== undefined && { description }),
      ...(totalAmount !== undefined && { totalAmount }),
      ...(totalInstallments !== undefined && { totalInstallments }),
    };

    const uniqueApproverIds = approverIds ? [...new Set(approverIds)] : undefined;

    this.auditContext.setOldValue(loanRequest);

    return this.loanRequestRepository.update(loanRequestId, payload, uniqueApproverIds);
  }

  async checkExistence(loanRequestId: string): Promise<LoanRequestDetail> {
    const loanRequest = await this.loanRequestRepository.findById(loanRequestId);
    if (!loanRequest) throw new NotFoundException("Loan request not found");
    return loanRequest;
  }

  async getInstallmentsForMonth(
    employeeId: string,
    paidMonth: string,
  ): Promise<LoanInstallmentSnapshot[]> {
    return this.loanRequestRepository.getInstallmentsForMonth(employeeId, paidMonth);
  }

  /** ============================= HELPERS =============================  */

  async decideApproval(
    loanRequestId: string,
    decideLoanApprovalDto: DecideLoanApprovalDto,
    userId: string,
  ): Promise<LoanRequestDetail> {
    const loanRequest = await this.checkExistence(loanRequestId);
    const { decision, remarks } = decideLoanApprovalDto;

    /**
     * Once the request is fully approved, installments have already been
     * generated, so the decision is locked. A still-pending or rejected
     * request can have its approver decisions revised freely.
     */
    const isAlreadyFullyApproved =
      loanRequest.status === LoanRequestStatus.APPROVED ||
      loanRequest.status === LoanRequestStatus.COMPLETED;

    if (isAlreadyFullyApproved) {
      throw new BadRequestException(
        "Cannot change an approval decision once the loan request has been fully approved",
      );
    }

    const approval = loanRequest.approvals.find((a) => a.approverId === userId);

    if (!approval) {
      throw new ForbiddenException("You are not an approver for this loan request");
    }

    return this.loanRequestRepository.decideApproval({
      loanRequestId,
      approverId: userId,
      decision,
      remarks,
      totalAmount: loanRequest.totalAmount,
      totalInstallments: loanRequest.totalInstallments,
    });
  }

  async payInstallment(
    loanRequestId: string,
    loanInstallmentId: string,
  ): Promise<LoanRequestDetail> {
    const loanRequest = await this.checkExistence(loanRequestId);

    if (loanRequest.status !== LoanRequestStatus.APPROVED) {
      throw new BadRequestException(
        `Installments can only be paid on a loan request that is fully approved`,
      );
    }

    const installment = loanRequest.installments.find((i) => i.id === loanInstallmentId);

    if (!installment) {
      throw new NotFoundException(`Installment not found for this loan request`);
    }

    if (installment.status !== LoanInstallmentStatus.PENDING) {
      throw new BadRequestException(`Installment has already been paid`);
    }

    this.auditContext.setOldValue(loanRequest);

    return this.loanRequestRepository.markInstallmentPaid(loanRequestId, loanInstallmentId);
  }

  private async checkEmployeeExists(
    employeeId: string,
  ): Promise<{ id: string; userId: string | null }> {
    const employee = await this.loanRequestRepository.findEmployeeById(employeeId);
    if (!employee) throw new NotFoundException("Employee not found");
    return employee;
  }

  /**
   * Every proposed approver must already hold "loan-requests.approve" through
   * Their role — assigning them here never grants it, it only records intent.
   */
  private async checkApproversCanApprove(approverIds: string[]): Promise<void> {
    const approverPermissionChecks = await Promise.all(
      approverIds.map(async (approverId) => ({
        approverId,
        canApprove: await this.permissionsService.hasPermission(
          approverId,
          "loan-requests.approve",
        ),
      })),
    );

    const approversWithoutPermission = approverPermissionChecks
      .filter((check) => !check.canApprove)
      .map((check) => check.approverId);

    if (approversWithoutPermission.length) {
      throw new BadRequestException(
        `The following user(s) do not have the "loan-requests.approve" permission and cannot be set as approvers: ${approversWithoutPermission.join(", ")}`,
      );
    }
  }

  /**
   * Blocks the loan request if its largest installment would exceed
   * MaxLoanInstallmentPercent of the employee's current monthly salary.
   */
  private async checkInstallmentAffordability(
    employeeId: string,
    totalAmount: number,
    totalInstallments: number,
  ): Promise<void> {
    const currentSalary = await this.salaryRevisionService.getCurrentSalaryForEmployee(employeeId);

    if (!currentSalary) {
      throw new BadRequestException(
        "Employee has no active salary on record — cannot validate loan affordability",
      );
    }

    const { maxLoanInstallmentPercent } = await this.hrSettingsService.getSettings();

    const maxAllowedInstallmentAmount = getMaxAllowedInstallmentAmount(
      Number(currentSalary.baseSalary),
      currentSalary.salaryFrequency,
      maxLoanInstallmentPercent,
    );

    const largestInstallmentAmount = Math.max(
      ...splitAmountIntoInstallments(totalAmount, totalInstallments),
    );

    if (largestInstallmentAmount > maxAllowedInstallmentAmount) {
      throw new BadRequestException(
        `Installment amount of ${largestInstallmentAmount} exceeds the maximum allowed ` +
          `${maxAllowedInstallmentAmount} (${maxLoanInstallmentPercent}% of monthly salary). ` +
          `Increase totalInstallments or reduce totalAmount.`,
      );
    }
  }

  /**
   * Only the user who created a loan request may update or delete it — holding
   * "loan-requests.manage" only unlocks the route, it never grants authority
   * over a request created by someone else.
   */
  private checkCreatorOwnership(
    loanRequest: LoanRequestDetail,
    userId: string,
    action: "update" | "delete",
  ): void {
    if (loanRequest.createdById !== userId) {
      throw new ForbiddenException(`Only the creator of a loan request can ${action} it`);
    }
  }

  /**
   * Once any approver has recorded a decision, the request is locked from
   * further changes — both update and delete share this restriction.
   */
  private checkNoApproverHasDecidedYet(
    loanRequest: LoanRequestDetail,
    action: "update" | "delete",
  ): void {
    const hasAnyApproverDecided = loanRequest.approvals.some(
      (approval) => approval.status !== LoanApprovalStatus.PENDING,
    );

    if (loanRequest.status !== LoanRequestStatus.PENDING || hasAnyApproverDecided) {
      throw new BadRequestException(
        `Can only ${action} a loan request while it is pending and no approver has decided yet`,
      );
    }
  }

  /**
   * Employees requesting a loan for themselves cannot also be one of their own approvers.
   */
  private checkApproversExcludeSelf(
    employee: { userId: string | null },
    approverIds: string[],
    userId: string,
  ): void {
    const isSelfRequest = employee.userId === userId;

    if (isSelfRequest && approverIds.includes(userId)) {
      throw new BadRequestException(
        "You cannot set yourself as an approver for your own loan request",
      );
    }
  }
}
