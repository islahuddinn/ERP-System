import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  Holiday,
  LeaveApprovalStatus,
  LeaveDurationType,
  LeaveRequestStatus,
  Prisma,
  WeekDay,
} from "@prisma/tenant-client";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { AuditContextService } from "../../audit/audit-context.service";
import { HrSettingsService } from "../hr-settings/hr-settings.service";
import { HolidayService } from "../holiday/holiday.service";
import { LeaveRequestRepository } from "./leave-request.repository";
import { CreateLeaveRequestDto } from "./dto/create-leave-request.dto";
import { DecideLeaveApprovalDto } from "./dto/decide-leave-approval.dto";
import { LeaveRequestFiltersDto } from "./dto/leave-request-filters.dto";
import { LeaveRequestDetail } from "./utils/types";

const WEEK_DAYS_BY_INDEX: WeekDay[] = [
  WeekDay.SUNDAY,
  WeekDay.MONDAY,
  WeekDay.TUESDAY,
  WeekDay.WEDNESDAY,
  WeekDay.THURSDAY,
  WeekDay.FRIDAY,
  WeekDay.SATURDAY,
];

@Injectable()
export class LeaveRequestService {
  constructor(
    private readonly leaveRequestRepository: LeaveRequestRepository,
    private readonly hrSettingsService: HrSettingsService,
    private readonly holidayService: HolidayService,
    private readonly auditContext: AuditContextService,
  ) {}

  async listLeaveRequests(
    leaveRequestFiltersDto: LeaveRequestFiltersDto,
  ): Promise<PaginatedResponse<LeaveRequestDetail>> {
    return this.leaveRequestRepository.findAll(leaveRequestFiltersDto);
  }

  async getLeaveRequest(leaveRequestId: string): Promise<LeaveRequestDetail> {
    return this.checkExistence(leaveRequestId);
  }

  async create(
    createLeaveRequestDto: CreateLeaveRequestDto,
    userId: string,
  ): Promise<LeaveRequestDetail> {
    const {
      employeeId,
      startDate,
      endDate,
      durationType = LeaveDurationType.FULL_DAY,
      isPaid = true,
      reason,
      approverIds,
    } = createLeaveRequestDto;

    const employee = await this.checkEmployeeExists(employeeId);

    /**
     * Employees requesting leave for themselves cannot also be one of their own approvers.
     */
    this.checkApproversExcludeSelf(employee, approverIds, userId);

    /**
     * Validate that all provided approver IDs exist in the system. This prevents creating leave requests with invalid approvers.
     */
    await this.leaveRequestRepository.validateApproverIds(approverIds);

    /**
     * Resolve the start and end dates:
     * - For HALF_DAY leave, endDate is forced to match startDate.
     * - For FULL_DAY leave, endDate must be provided and cannot be before startDate.
     */
    const { startDate: resolvedStartDate, endDate: resolvedEndDate } = this.resolveDateRange(
      durationType,
      new Date(startDate),
      endDate ? new Date(endDate) : undefined,
    );

    /**
     * Reject requests that fall on a public holiday — those days are already
     * non-working, so leave must not be consumed for them.
     */
    await this.checkNoHolidayOverlap(resolvedStartDate, resolvedEndDate);

    /**
     * Prevent conflicting requests for the same employee:
     * - HALF_DAY: at most two half-day requests are allowed on the same date.
     * - FULL_DAY: an identical active request (same dates) is a duplicate.
     */
    if (durationType === LeaveDurationType.HALF_DAY) {
      await this.checkHalfDayLimitNotExceeded(employeeId, resolvedStartDate);
    } else {
      await this.checkNoDuplicateRequest(
        employeeId,
        resolvedStartDate,
        resolvedEndDate,
        durationType,
      );
    }

    /**
     * A new request must not overlap any leave the employee already has approved.
     */
    await this.checkNoOverlapWithApprovedLeave(employeeId, resolvedStartDate, resolvedEndDate);

    /**
     * - Calculate the total number of leave days, excluding weekly off days configured in HR settings.
     */
    const { totalDays, leaveDates } = await this.resolveLeaveSchedule(
      durationType,
      resolvedStartDate,
      resolvedEndDate,
    );

    /**
     * When leave is Paid then:
     * - Check if the employee has an active contract to request paid leave against.
     * - Check if the employee has sufficient leave balance in their active contract to cover the requested leave days.
     */
    if (isPaid) {
      await this.checkSufficientBalance(employeeId, totalDays);
    }

    const payload: Prisma.LeaveRequestUncheckedCreateInput = {
      employeeId,
      startDate: resolvedStartDate,
      endDate: resolvedEndDate,
      durationType,
      isPaid,
      totalDays,
      leaveDates,
      reason: reason ?? null,
      createdById: userId,
    };

    const uniqueApproverIds = [...new Set(approverIds)];

    return this.leaveRequestRepository.create(payload, uniqueApproverIds);
  }

  async delete(leaveRequestId: string): Promise<void> {
    const leaveRequest = await this.checkExistence(leaveRequestId);

    const hasAnyApproverDecided = leaveRequest.approvals.some(
      (approval) => approval.status !== LeaveApprovalStatus.PENDING,
    );

    if (leaveRequest.status !== LeaveRequestStatus.PENDING || hasAnyApproverDecided) {
      throw new BadRequestException(
        "Can only delete a leave request while it is pending and no approver has decided yet",
      );
    }

    this.auditContext.setOldValue(leaveRequest);

    await this.leaveRequestRepository.delete(leaveRequestId);
  }

  async decideApproval(
    leaveRequestId: string,
    decideLeaveApprovalDto: DecideLeaveApprovalDto,
    userId: string,
  ): Promise<LeaveRequestDetail> {
    const leaveRequest = await this.checkExistence(leaveRequestId);
    const { decision, remarks } = decideLeaveApprovalDto;

    /**
     * Once the request is fully approved, paid leave has already been deducted
     * from the employee's contract, so the decision is locked. A still-pending
     * or rejected request can have its approver decisions revised freely.
     */
    if (leaveRequest.status === LeaveRequestStatus.APPROVED) {
      throw new BadRequestException(
        "Cannot change an approval decision once the leave request has been fully approved",
      );
    }

    const approval = leaveRequest.approvals.find((a) => a.approverId === userId);

    if (!approval) {
      throw new ForbiddenException("You are not an approver for this leave request");
    }

    return this.leaveRequestRepository.decideApproval({
      leaveRequestId,
      approverId: userId,
      decision,
      remarks,
      isPaid: leaveRequest.isPaid,
      totalDays: leaveRequest.totalDays,
      employeeId: leaveRequest.employeeId,
      startDate: leaveRequest.startDate,
      endDate: leaveRequest.endDate,
      durationType: leaveRequest.durationType,
    });
  }

  async checkExistence(leaveRequestId: string): Promise<LeaveRequestDetail> {
    const leaveRequest = await this.leaveRequestRepository.findById(leaveRequestId);
    if (!leaveRequest) throw new NotFoundException("Leave request not found");
    return leaveRequest;
  }

  private async checkEmployeeExists(
    employeeId: string,
  ): Promise<{ id: string; userId: string | null }> {
    const employee = await this.leaveRequestRepository.findEmployeeById(employeeId);
    if (!employee) throw new NotFoundException("Employee not found");
    return employee;
  }

  // Employees requesting leave for themselves cannot also be one of their own approvers.
  private checkApproversExcludeSelf(
    employee: { userId: string | null },
    approverIds: string[],
    userId: string,
  ): void {
    const isSelfRequest = employee.userId === userId;

    if (isSelfRequest && approverIds.includes(userId)) {
      throw new BadRequestException(
        "You cannot set yourself as an approver for your own leave request",
      );
    }
  }

  private async checkSufficientBalance(employeeId: string, totalDays: number): Promise<void> {
    const activeContract =
      await this.leaveRequestRepository.findActiveContractByEmployee(employeeId);

    if (!activeContract) {
      throw new BadRequestException(
        "Employee has no active contract to request paid leave against",
      );
    }

    const remainingBalance =
      Number(activeContract.totalLeaves) - Number(activeContract.consumedLeaves);

    if (remainingBalance < totalDays) {
      throw new BadRequestException(
        `Insufficient leave balance: ${remainingBalance} day(s) remaining, ${totalDays} requested`,
      );
    }
  }

  // #7 — An identical active request (same employee, dates and duration type) is a duplicate.
  private async checkNoDuplicateRequest(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    durationType: LeaveDurationType,
  ): Promise<void> {
    const duplicate = await this.leaveRequestRepository.findActiveDuplicate(
      employeeId,
      startDate,
      endDate,
      durationType,
    );

    if (duplicate) {
      throw new ConflictException(
        "A leave request for this employee already exists for the same dates and duration type",
      );
    }
  }

  // #8 — A new request cannot overlap any leave the employee already has approved.
  private async checkNoOverlapWithApprovedLeave(
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<void> {
    const overlappingApprovedLeave = await this.leaveRequestRepository.findOverlappingApprovedLeave(
      employeeId,
      startDate,
      endDate,
    );

    if (overlappingApprovedLeave) {
      throw new ConflictException(
        "This leave request overlaps a leave period that is already approved for this employee",
      );
    }
  }

  // #14 — At most two half-day leave requests are allowed per employee per date.
  private async checkHalfDayLimitNotExceeded(employeeId: string, date: Date): Promise<void> {
    const existingHalfDayCount = await this.leaveRequestRepository.countActiveHalfDayLeavesOnDate(
      employeeId,
      date,
    );

    if (existingHalfDayCount >= 2) {
      throw new ConflictException(
        "An employee cannot have more than two half-day leave requests on the same date",
      );
    }
  }

  // #12 — Leave cannot be requested on a public holiday.
  private async checkNoHolidayOverlap(startDate: Date, endDate: Date): Promise<void> {
    const holiday = await this.leaveRequestRepository.findOverlappingHoliday(startDate, endDate);

    if (holiday) {
      throw new BadRequestException(
        `Leave cannot be requested on a public holiday ("${holiday.name}")`,
      );
    }
  }

  // HALF_DAY always applies to a single date, so endDate is forced to match startDate.
  private resolveDateRange(
    durationType: LeaveDurationType,
    startDate: Date,
    endDate?: Date,
  ): { startDate: Date; endDate: Date } {
    if (durationType === LeaveDurationType.HALF_DAY) {
      return { startDate, endDate: startDate };
    }

    if (!endDate) {
      throw new BadRequestException("endDate is required for full-day leave requests");
    }

    if (endDate < startDate) {
      throw new BadRequestException("endDate cannot be before startDate");
    }

    return { startDate, endDate };
  }

  // Excludes the tenant's configured weekly off days (e.g. Sat/Sun) and holidays,
  // returning both the resolved leave dates and the count derived from them.
  private async resolveLeaveSchedule(
    durationType: LeaveDurationType,
    startDate: Date,
    endDate: Date,
  ): Promise<{ totalDays: number; leaveDates: Date[] }> {
    const [{ weeklyOffDays }, holidays] = await Promise.all([
      this.hrSettingsService.getSettings(),
      this.holidayService.findHolidaysInRange(startDate, endDate),
    ]);
    const holidayDates = this.buildHolidayDateSet(holidays);

    if (durationType === LeaveDurationType.HALF_DAY) {
      const isWeeklyOffDay = weeklyOffDays.includes(this.weekDayOf(startDate));
      const isHoliday = holidayDates.has(this.dateKey(startDate));

      if (isWeeklyOffDay || isHoliday) {
        throw new BadRequestException("Cannot request leave on a weekly off day or holiday");
      }
      return { totalDays: 0.5, leaveDates: [startDate] };
    }

    const leaveDates = this.collectWorkingDates(startDate, endDate, weeklyOffDays, holidayDates);
    if (leaveDates.length === 0) {
      throw new BadRequestException("Leave date range contains no working days");
    }

    return { totalDays: leaveDates.length, leaveDates };
  }

  private collectWorkingDates(
    startDate: Date,
    endDate: Date,
    weeklyOffDays: WeekDay[],
    holidayDates: Set<string>,
  ): Date[] {
    const offDays = new Set(weeklyOffDays);
    const workingDates: Date[] = [];

    for (
      const current = new Date(startDate);
      current <= endDate;
      current.setDate(current.getDate() + 1)
    ) {
      const isWeeklyOffDay = offDays.has(this.weekDayOf(current));
      const isHoliday = holidayDates.has(this.dateKey(current));

      if (!isWeeklyOffDay && !isHoliday) workingDates.push(new Date(current));
    }

    return workingDates;
  }

  // Expands each overlapping holiday's own date range into individual calendar-date keys.
  private buildHolidayDateSet(holidays: Holiday[]): Set<string> {
    const dates = new Set<string>();

    for (const holiday of holidays) {
      for (
        const current = new Date(holiday.startDate);
        current <= holiday.endDate;
        current.setDate(current.getDate() + 1)
      ) {
        dates.add(this.dateKey(current));
      }
    }

    return dates;
  }

  private dateKey(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  private weekDayOf(date: Date): WeekDay {
    return WEEK_DAYS_BY_INDEX[date.getDay()];
  }

  async getMetricsForPeriod(
    employeeId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{ paidLeaveDays: number; unpaidLeaveDays: number; leaveDates: string[] }> {
    return this.leaveRequestRepository.getMetricsForPeriod(employeeId, periodStart, periodEnd);
  }
}
