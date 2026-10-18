import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { Decimal } from "@prisma/client/runtime/library";
import { PayrollRepository } from "./payroll.repository";
import { CreatePayrollDto } from "./dto/create-payroll.dto";
import { PayrollQueryDto } from "./dto/payroll-query.dto";
import { AddBonusDto } from "./dto/add-bonus.dto";
import { PaginatedResponse } from "src/common/dto/pagination.dto";
import { PayrollStatus, SalaryRevisionStatus } from "@prisma/tenant-client";
import { PayrollCalculation, AddBonusData } from "./utils/types";
import { PayrollHelper } from "./utils/payroll.helper";
import {
  calculateTotalCalendarDays,
  calculateWeekends,
  calculateWorkingDays,
} from "src/common/reuseable-functions/dateCalculations";
import { HolidayService } from "../holiday/holiday.service";
import { LeaveRequestService } from "../leave-request/leave-request.service";
import { HrSettingsService } from "../hr-settings/hr-settings.service";
import { LoanRequestService } from "../loan-request/loan-request.service";
import { PayrollResponse, CreatePayrollResult, BulkPayrollResult } from "./types/payroll-response";
import { AuditContextService } from "src/audit/audit-context.service";
import { PermissionsService } from "src/users/permissions/permissions.service";
import { GlPostingService } from "src/financial/gl-posting/gl-posting.service";
import { GlPostingKind, GlSourceType } from "src/financial/gl-posting/utils/enums";

@Injectable()
export class PayrollService {
  constructor(
    private readonly payrollRepository: PayrollRepository,
    private readonly holidayService: HolidayService,
    private readonly leaveRequestService: LeaveRequestService,
    private readonly hrSettingsService: HrSettingsService,
    private readonly loanRequestService: LoanRequestService,
    private readonly auditContext: AuditContextService,
    private readonly permissionsService: PermissionsService,
    private readonly glPostingService: GlPostingService,
  ) {}

  /**
   * "payroll.view" sees every employee's payroll; a caller with only
   * "payroll.view-own" is restricted to their own records below.
   */
  private async canViewAnyPayroll(userId: string): Promise<boolean> {
    const permissions = await this.permissionsService.getUserEffectivePermissions(userId);
    return permissions.includes("payroll.view");
  }

  private async getOwnEmployeeId(userId: string): Promise<string> {
    const employeeId = await this.payrollRepository.findEmployeeIdByUserId(userId);

    if (!employeeId) {
      throw new NotFoundException("No employee record linked to this user");
    }

    return employeeId;
  }

  async findAll(
    payrollQueryDto: PayrollQueryDto,
    userId: string,
  ): Promise<PaginatedResponse<PayrollResponse>> {
    if (!(await this.canViewAnyPayroll(userId))) {
      payrollQueryDto.employeeId = await this.getOwnEmployeeId(userId);
    }

    return this.payrollRepository.findAll(payrollQueryDto);
  }

  async findOne(payrollId: string, userId?: string): Promise<PayrollResponse> {
    const payroll = await this.payrollRepository.findById(payrollId);

    if (!payroll) {
      throw new NotFoundException(`Payroll not found: ${payrollId}`);
    }

    if (userId && !(await this.canViewAnyPayroll(userId))) {
      const ownEmployeeId = await this.getOwnEmployeeId(userId);

      if (payroll.employeeId !== ownEmployeeId) {
        throw new ForbiddenException("You can only view your own payroll records");
      }
    }

    return payroll;
  }

  async preview(createPayrollDto: CreatePayrollDto): Promise<PayrollCalculation> {
    const [employeeId] = createPayrollDto.employeeIds;

    const calculation = await this.calculatePayroll(createPayrollDto, employeeId);

    return calculation;
  }

  async create(createPayrollDto: CreatePayrollDto, userId: string): Promise<CreatePayrollResult> {
    const { employeeIds } = createPayrollDto;

    if (employeeIds?.length === 1) {
      return this.createSingle(employeeIds[0], createPayrollDto, userId);
    }

    return this.createBulk(employeeIds, createPayrollDto, userId);
  }

  private async createSingle(
    employeeId: string,
    createPayrollDto: CreatePayrollDto,
    userId: string,
  ): Promise<PayrollResponse> {
    const { paidMonth } = createPayrollDto;

    const periodStart = new Date(createPayrollDto.periodStart);
    const periodEnd = new Date(createPayrollDto.periodEnd);

    /**
     * Check existing payroll for the employee and period to avoid duplicates
     */
    const existing = await this.payrollRepository.findByEmployeeAndPeriod(employeeId, periodStart);

    if (existing) {
      throw new ConflictException(`Payroll already exists for this employee and period`);
    }

    const calculation = await this.calculatePayroll(createPayrollDto, employeeId);

    const payroll = await this.payrollRepository.create({
      employee: { connect: { id: employeeId } },
      periodStart,
      periodEnd,
      paidMonth,

      ...calculation,

      status: PayrollStatus.DRAFT,
      createdById: userId,
      updatedById: userId,
    });

    return payroll;
  }

  private async createBulk(
    employeeIds: string[],
    createPayrollDto: CreatePayrollDto,
    userId: string,
  ): Promise<BulkPayrollResult> {
    const promises = employeeIds.map((employeeId) =>
      this.createSingle(employeeId, createPayrollDto, userId)
        .then((payroll) => ({ status: "fulfilled" as const, payrollId: payroll.id, employeeId }))
        .catch((error) => ({
          status: "rejected" as const,
          employeeId,
          reason: error instanceof Error ? error.message : "Unknown error",
        })),
    );

    const results = await Promise.all(promises);

    return {
      created: results
        .filter((r) => r.status === "fulfilled")
        .map((r) => ({ payrollId: (r as any).payrollId, employeeId: r.employeeId })),
      failed: results
        .filter((r) => r.status === "rejected")
        .map((r) => ({ employeeId: r.employeeId, reason: (r as any).reason })),
    };
  }

  async approve(payrollId: string, approvedById: string): Promise<PayrollResponse> {
    const payroll = await this.findOne(payrollId);

    if (payroll.status !== PayrollStatus.DRAFT) {
      throw new BadRequestException("Only DRAFT payroll can be approved");
    }

    this.auditContext.setOldValue(payroll);

    const updatedCount = await this.payrollRepository.updateStatus(
      payrollId,
      PayrollStatus.DRAFT,
      PayrollStatus.APPROVED,
      approvedById,
    );

    if (updatedCount === 0) {
      throw new ConflictException(
        "Payroll status changed before it could be approved — please refresh and try again",
      );
    }

    return this.findOne(payrollId);
  }

  async pay(payrollId: string): Promise<PayrollResponse> {
    const payroll = await this.findOne(payrollId);

    if (payroll.status !== PayrollStatus.APPROVED) {
      throw new BadRequestException("Only APPROVED payroll can be paid");
    }

    this.auditContext.setOldValue(payroll);

    const netPay = Number(payroll.netPay);
    if (netPay > 0) {
      await this.glPostingService.postBalancedEntry({
        sourceType: GlSourceType.PAYROLL,
        sourceId: payrollId,
        postingKind: GlPostingKind.PAY_SALARY,
        entryDate: new Date(),
        description: `Payroll ${payroll.paidMonth} for employee ${payroll.employeeId}`,
        lines: [
          { accountKey: "SALARY_EXPENSE", debit: netPay, credit: 0, description: "Net salary" },
          { accountKey: "CASH", debit: 0, credit: netPay, description: "Salary paid" },
        ],
      });
    }

    const updatedCount = await this.payrollRepository.updateStatus(
      payrollId,
      PayrollStatus.APPROVED,
      PayrollStatus.PAID,
      undefined,
      new Date(),
    );

    if (updatedCount === 0) {
      throw new ConflictException(
        "Payroll status changed before it could be marked as paid — please refresh and try again",
      );
    }

    await this.payLoanInstallmentForMonth(payroll.employeeId, payroll.paidMonth);

    return this.findOne(payrollId);
  }

  /**
   * Marks the employee's loan installment for this payroll's paidMonth as paid.
   * calculatePayroll already guarantees at most one PENDING installment per
   * employee per month, so this is a no-op unless exactly one is outstanding.
   */
  private async payLoanInstallmentForMonth(employeeId: string, paidMonth: string): Promise<void> {
    const [installment] = await this.loanRequestService.getInstallmentsForMonth(
      employeeId,
      paidMonth,
    );

    if (!installment) return;

    await this.loanRequestService.payInstallment(installment.loanRequestId, installment.id);
  }

  /**
   * Adds/replaces the ad-hoc bonus on a single DRAFT payroll. The gross salary
   * is recomputed from the pre-bonus base (grossSalary - existing bonusAmount) so
   * calling this twice never compounds the previous bonus.
   *
   * The actual write is gated on `status = DRAFT` at the DB level (see
   * PayrollRepository.addBonus) — if this payroll gets approved by a concurrent
   * request between the check above and the write, the write matches zero rows
   * and we surface a conflict instead of silently mutating an already-approved payroll.
   */
  async addBonus(
    payrollId: string,
    addBonusDto: AddBonusDto,
    userId: string,
  ): Promise<PayrollResponse> {
    const payroll = await this.findOne(payrollId);

    if (payroll?.status !== PayrollStatus.DRAFT) {
      throw new BadRequestException(`Bonus can only be added to a DRAFT payroll`);
    }

    this.auditContext.setOldValue(payroll);

    const { bonusAmount, bonusReason } = addBonusDto;

    const newBonusAmount = new Decimal(bonusAmount);
    const baseGrossSalary = payroll.grossSalary.minus(payroll.bonusAmount);
    const grossSalary = baseGrossSalary.plus(newBonusAmount);
    const netPay = grossSalary.minus(payroll.totalDeductions);

    const bonusData: AddBonusData = {
      bonusAmount: newBonusAmount,
      bonusReason: bonusReason ?? null,
      grossSalary,
      netPay,
      updatedById: userId,
    };

    const updatedCount = await this.payrollRepository.addBonus(payrollId, bonusData);

    if (updatedCount === 0) {
      throw new ConflictException(
        `Payroll was approved before the bonus could be applied — please refresh and try again`,
      );
    }

    return this.findOne(payrollId);
  }

  private async calculatePayroll(
    createPayrollDto: CreatePayrollDto,
    employeeId: string,
  ): Promise<PayrollCalculation> {
    const periodStart = new Date(createPayrollDto.periodStart);
    const periodEnd = new Date(createPayrollDto.periodEnd);

    /**
     * STEP 1: Fetch employee contract and salary revision
     */
    const contract = await this.payrollRepository.getActiveContract(employeeId, periodStart);

    if (!contract || !contract?.salaryRevisions?.length) {
      throw new BadRequestException(
        `No active contract found for this employee in the given period`,
      );
    }

    const revision = contract?.salaryRevisions?.find(
      (r) => r.status === SalaryRevisionStatus.CURRENT,
    );

    if (!revision) {
      throw new BadRequestException(`No active salary revision found for this employee`);
    }

    const baseSalary = revision.baseSalary;

    /**
     * Allowances are paid in full regardless of attendance — they're added on
     * top of baseSalary for gross/net pay, but never factored into the
     * per-day/hour/minute rate used for absence/timing/unpaid-leave deductions below.
     */
    const allowancesTotal = PayrollHelper.calculateAllowancesTotal(contract.allowances);
    const grossSalary = baseSalary.plus(allowancesTotal);

    /**
     * STEP 2: Calculate working days (excluding holidays and weekends)
     *
     * This is an informational metric only (persisted for reporting) — it
     * reflects the month's calendar structure and is never reduced by leave;
     * unpaid leave is tracked separately via leaveMetrics.unpaidLeaveDays and
     * never used to derive salaryPerDay below.
     */
    const totalCalendarDays = calculateTotalCalendarDays(periodStart, periodEnd);
    const holidays = await this.holidayService.countInPeriod(periodStart, periodEnd);
    const hrSettings = await this.hrSettingsService.getSettings();
    const weekends = calculateWeekends(periodStart, periodEnd, hrSettings.weeklyOffDays);
    const workingDays = calculateWorkingDays(totalCalendarDays, holidays, weekends);

    const leaveMetrics = await this.leaveRequestService.getMetricsForPeriod(
      employeeId,
      periodStart,
      periodEnd,
    );

    /**
     * STEP 3: Calculate salary components (per day, per hour, per minute)
     * Used to calculate deductions based on actual work time.
     *
     * Derived from grossSalary (baseSalary + allowances) divided by the total
     * calendar days in the period — the divisor is always the full number of
     * days in the month (e.g. 31 for July) regardless of how many holidays or
     * leaves fall within it, so the per-day rate stays stable month to month.
     */
    const { salaryPerDay, salaryPerHour, salaryPerMinute } = PayrollHelper.calculateSalaryBreakdown(
      grossSalary,
      totalCalendarDays,
    );

    /**
     * STEP 4: Fetch and validate attendance records
     *
     * Dates covered by an approved leave (paid or unpaid) are excluded here —
     * they're already accounted for via paidLeaveDays/unpaidLeaveDays, so they
     * must never also be counted as an uninformed absence.
     */
    const attendanceMetrics = await this.payrollRepository.getAttendanceMetrics(
      employeeId,
      periodStart,
      periodEnd,
      leaveMetrics.leaveDates,
    );

    const absentDays = attendanceMetrics.absentDays;
    const timingMinutes = attendanceMetrics.timingMinutes;

    /**
     * STEP 5: Calculate attendance-based deductions
     *
     * ABSENT DAYS: Full day absences (employee didn't show up)
     * Deduction = absentDays × salaryPerDay
     */
    const absentDaysDeduction = PayrollHelper.calculateAbsentDaysDeduction(
      absentDays,
      salaryPerDay,
    );

    /**
     * TIMING: Late arrival or early checkout minutes
     * Deduction = timingMinutes × salaryPerMinute
     */
    const timingDeduction = PayrollHelper.calculateTimingDeduction(timingMinutes, salaryPerMinute);

    /**
     * UNPAID LEAVE: Approved leave requests marked isPaid: false
     * Deduction = unpaidLeaveDays × salaryPerDay
     */
    const unpaidLeaveDeduction = PayrollHelper.calculateUnpaidLeaveDeduction(
      leaveMetrics.unpaidLeaveDays,
      salaryPerDay,
    );

    /**
     * STEP 6: Calculate loan-based deductions
     *
     * LOAN DEDUCTION: Validate single installment per month, then fetch amount
     * Constraint: Only one loan deduction allowed per calendar month
     */
    const loanDeductions = await this.loanRequestService.getInstallmentsForMonth(
      employeeId,
      createPayrollDto?.paidMonth,
    );

    if (loanDeductions?.length > 1) {
      throw new BadRequestException(
        `Multiple loan installments found for ${createPayrollDto?.paidMonth}. Only one deduction per month is allowed.`,
      );
    }

    const loanDeduction = loanDeductions?.length === 1 ? loanDeductions[0]?.amount : new Decimal(0);

    /**
     * STEP 7: Calculate net pay
     *
     * Gross = baseSalary + allowancesTotal (allowances paid in full, unaffected by attendance)
     * Total Deductions = absentDaysDeduction + timingDeduction + unpaidLeaveDeduction + loanDeduction
     * Net Pay = Gross - Total Deductions (take-home salary)
     */
    const totalDeductions = absentDaysDeduction
      .plus(timingDeduction)
      .plus(unpaidLeaveDeduction)
      .plus(loanDeduction);
    const netPay = grossSalary.minus(totalDeductions);

    return {
      grossSalary,
      allowancesTotal,
      salaryPerDay,
      salaryPerHour,
      salaryPerMinute,
      totalCalendarDays,
      holidays,
      weekends,
      paidLeaveDays: leaveMetrics.paidLeaveDays,
      unpaidLeaveDays: leaveMetrics.unpaidLeaveDays,
      workingDays,
      presentDays: attendanceMetrics.presentDays,
      absentDays,
      timingMinutes,
      absentDaysDeduction,
      timingDeduction,
      unpaidLeaveDeduction,
      loanDeduction,
      totalDeductions,
      netPay,
    };
  }
}
