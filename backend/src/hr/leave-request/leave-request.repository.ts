import { BadRequestException, Injectable } from "@nestjs/common";
import {
  AttendanceStatus,
  ContractStatus,
  EmployeeContract,
  LeaveApprovalStatus,
  LeaveDurationType,
  LeaveRequestStatus,
  Prisma,
} from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import { buildOrderBy } from "../../common/utils/pagination.helper";
import { EMPLOYEE_SHIFT_SELECT } from "../attendance/utils/constants";
import { AttendanceHelper } from "../attendance/utils/attendance.helper";
import {
  calculateAttendanceMetrics,
  calculateLateMinutes,
} from "../attendance/utils/attendance-calculator.util";
import { LeaveRequestFiltersDto } from "./dto/leave-request-filters.dto";
import { LEAVE_REQUEST_INCLUDE, USER_SELECT } from "./utils/constants";
import { DecideApprovalParams, LeaveRequestDetail, UsersMap } from "./utils/types";

// Whitelist guards against Prisma validation errors (500) on arbitrary sortBy
// values. Nested employee → user relation fields are folded into the nested
// shape Prisma requires by buildOrderBy ({ employee: { user: { firstName: "asc" } } }).
const LEAVE_REQUEST_SORTABLE_FIELDS = [
  "startDate",
  "endDate",
  "totalDays",
  "durationType",
  "isPaid",
  "status",
  "createdAt",
  "updatedAt",
  "employee.user.firstName",
];

@Injectable()
export class LeaveRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    leaveRequestFiltersDto: LeaveRequestFiltersDto,
  ): Promise<PaginatedResponse<LeaveRequestDetail>> {
    const { employeeId, status, page = 1, limit = 10, sortBy, sortOrder } = leaveRequestFiltersDto;
    const skip = (page - 1) * limit;
    const where: Prisma.LeaveRequestWhereInput = {};

    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;

    const orderBy =
      sortBy && LEAVE_REQUEST_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { createdAt: "desc" as const };

    const [data, total] = await Promise.all([
      this.prisma.leaveRequest.findMany({
        where,
        include: LEAVE_REQUEST_INCLUDE,
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.leaveRequest.count({ where }),
    ]);

    const usersMap = await this.fetchUsersMap(
      data.flatMap((leaveRequest) => [
        leaveRequest.createdById,
        ...leaveRequest.approvals.map((approval) => approval.approverId),
      ]),
    );

    const leaves = data.map((leaveRequest) => this.serializeLeaveRequest(leaveRequest, usersMap));

    return buildPaginatedResponse(leaves, total, page, limit);
  }

  async findById(leaveRequestId: string): Promise<LeaveRequestDetail | null> {
    const leaveRequest = await this.prisma.leaveRequest.findUnique({
      where: { id: leaveRequestId },
      include: LEAVE_REQUEST_INCLUDE,
    });

    const usersMap = await this.fetchUsersMapForLeaveRequest(leaveRequest);
    return this.serializeLeaveRequest(leaveRequest, usersMap);
  }

  async delete(leaveRequestId: string): Promise<void> {
    await this.prisma.leaveRequest.delete({ where: { id: leaveRequestId } });
  }

  async findEmployeeById(
    employeeId: string,
  ): Promise<{ id: string; userId: string | null } | null> {
    return this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, userId: true },
    });
  }

  async findActiveContractByEmployee(employeeId: string): Promise<EmployeeContract | null> {
    return this.prisma.employeeContract.findFirst({
      where: { employeeId, status: ContractStatus.ACTIVE },
    });
  }

  // A leave request is "active" while it is still PENDING or APPROVED — a
  // REJECTED or CANCELLED request no longer blocks a new request.
  private static readonly ACTIVE_STATUSES = [
    LeaveRequestStatus.PENDING,
    LeaveRequestStatus.APPROVED,
  ];

  // Exact-duplicate guard (#7): same employee, same date range and same
  // duration type on an active (non-rejected, non-cancelled) request.
  async findActiveDuplicate(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    durationType: LeaveDurationType,
  ): Promise<{ id: string } | null> {
    return this.prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        startDate,
        endDate,
        durationType,
        status: { in: LeaveRequestRepository.ACTIVE_STATUSES },
      },
      select: { id: true },
    });
  }

  // Approved-overlap guard (#8): any already-APPROVED leave for the employee
  // whose date range intersects [startDate, endDate].
  async findOverlappingApprovedLeave(
    employeeId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ id: string; startDate: Date; endDate: Date } | null> {
    return this.prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: LeaveRequestStatus.APPROVED,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: { id: true, startDate: true, endDate: true },
    });
  }

  // Half-day cap guard (#14): number of active HALF_DAY requests the employee
  // already has on a specific date.
  async countActiveHalfDayLeavesOnDate(employeeId: string, date: Date): Promise<number> {
    return this.prisma.leaveRequest.count({
      where: {
        employeeId,
        durationType: LeaveDurationType.HALF_DAY,
        startDate: date,
        status: { in: LeaveRequestRepository.ACTIVE_STATUSES },
      },
    });
  }

  // Public-holiday guard (#12): the first holiday whose date range intersects
  // [startDate, endDate], if any. Reads the shared hr_holidays table directly.
  async findOverlappingHoliday(
    startDate: Date,
    endDate: Date,
  ): Promise<{ name: string; startDate: Date; endDate: Date } | null> {
    return this.prisma.holiday.findFirst({
      where: {
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: { name: true, startDate: true, endDate: true },
    });
  }

  async validateApproverIds(approverIds: string[]): Promise<void> {
    const uniqueApproverIds = [...new Set(approverIds)];

    const foundUsers = await this.prisma.user.findMany({
      where: { id: { in: uniqueApproverIds }, loginAccess: "ENABLED" },
      select: { id: true },
    });

    const foundIds = new Set(foundUsers.map((user) => user.id));
    const invalidIds = uniqueApproverIds.filter((id) => !foundIds.has(id));

    if (invalidIds.length) {
      throw new BadRequestException(
        `The following approver user ID(s) are invalid: ${invalidIds.join(", ")}`,
      );
    }
  }

  async create(
    data: Prisma.LeaveRequestUncheckedCreateInput,
    approverIds: string[],
  ): Promise<LeaveRequestDetail> {
    const result = await this.prisma.$transaction(async (tx) => {
      const leaveRequest = await tx.leaveRequest.create({ data });

      await tx.leaveRequestApproval.createMany({
        data: approverIds.map((approverId) => ({ leaveRequestId: leaveRequest.id, approverId })),
      });

      return tx.leaveRequest.findUniqueOrThrow({
        where: { id: leaveRequest.id },
        include: LEAVE_REQUEST_INCLUDE,
      });
    });

    const usersMap = await this.fetchUsersMapForLeaveRequest(result);
    return this.serializeLeaveRequest(result, usersMap);
  }

  /**
   * Records one approver's decision and recomputes the overall request status
   * from every approver's current decision. A single rejection puts the whole
   * request into REJECTED; the request only becomes APPROVED once every
   * approver has approved, at which point paid leave is deducted from the
   * employee's active contract in the same transaction. The caller (service
   * layer) prevents this method from running once the request has already
   * reached APPROVED, so the deduction can only ever happen once.
   */
  async decideApproval(decideApprovalParams: DecideApprovalParams): Promise<LeaveRequestDetail> {
    const {
      leaveRequestId,
      approverId,
      decision,
      remarks,
      isPaid,
      totalDays,
      employeeId,
      startDate,
      endDate,
      durationType,
    } = decideApprovalParams;

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.leaveRequestApproval.update({
        where: { leaveRequestId_approverId: { leaveRequestId, approverId } },
        data: {
          status: decision,
          remarks: remarks ?? null,
          decidedAt: decision === LeaveApprovalStatus.PENDING ? null : new Date(),
        },
      });

      const overallStatus = await this.resolveOverallStatus(tx, leaveRequestId);

      await tx.leaveRequest.update({
        where: { id: leaveRequestId },
        data: { status: overallStatus },
      });

      if (overallStatus === LeaveRequestStatus.APPROVED) {
        if (isPaid) {
          await this.deductFromActiveContract(tx, employeeId, totalDays);
        }

        await this.syncAttendanceForApprovedLeave(tx, employeeId, startDate, endDate, durationType);
      }

      return tx.leaveRequest.findUniqueOrThrow({
        where: { id: leaveRequestId },
        include: LEAVE_REQUEST_INCLUDE,
      });
    });

    const usersMap = await this.fetchUsersMapForLeaveRequest(result);
    return this.serializeLeaveRequest(result, usersMap);
  }

  // A single rejection rejects the whole request; it's approved only once every approver has approved.
  private async resolveOverallStatus(
    tx: Prisma.TransactionClient,
    leaveRequestId: string,
  ): Promise<
    | typeof LeaveRequestStatus.APPROVED
    | typeof LeaveRequestStatus.REJECTED
    | typeof LeaveRequestStatus.PENDING
  > {
    const approvals = await tx.leaveRequestApproval.findMany({
      where: { leaveRequestId },
      select: { status: true },
    });

    if (approvals.some((approval) => approval.status === LeaveApprovalStatus.REJECTED)) {
      return LeaveRequestStatus.REJECTED;
    }

    if (approvals.every((approval) => approval.status === LeaveApprovalStatus.APPROVED)) {
      return LeaveRequestStatus.APPROVED;
    }

    return LeaveRequestStatus.PENDING;
  }

  private async deductFromActiveContract(
    tx: Prisma.TransactionClient,
    employeeId: string,
    totalDays: number,
  ): Promise<void> {
    const activeContract = await tx.employeeContract.findFirst({
      where: { employeeId, status: ContractStatus.ACTIVE },
    });

    if (!activeContract) {
      throw new BadRequestException("Employee has no active contract to deduct leave from");
    }

    const remainingBalance =
      Number(activeContract.totalLeaves) - Number(activeContract.consumedLeaves);
    if (remainingBalance < Number(totalDays)) {
      throw new BadRequestException("Insufficient leave balance on the employee's active contract");
    }

    await tx.employeeContract.update({
      where: { id: activeContract.id },
      data: { consumedLeaves: { increment: totalDays } },
    });
  }

  /**
   * Recomputes lateMinutes/status (and, when checkOut already exists, the full
   * metrics) for any attendance record that falls on a date this leave now covers.
   * Runs in the same transaction as the approval so attendance never sees a
   * stale state for an already-approved leave. Uses the attendance module's
   * pure calculation utilities directly (not the service) to avoid a circular
   * module dependency between leave-request and attendance.
   */
  private async syncAttendanceForApprovedLeave(
    tx: Prisma.TransactionClient,
    employeeId: string,
    startDate: Date,
    endDate: Date,
    durationType: LeaveDurationType,
  ): Promise<void> {
    const startDateString = startDate.toISOString().split("T")[0];
    const endDateString = endDate.toISOString().split("T")[0];

    const attendanceRecords = await tx.attendance.findMany({
      where: {
        employeeId,
        shiftId: { not: null },
        date: { gte: startDateString, lte: endDateString },
      },
      include: { shift: { select: EMPLOYEE_SHIFT_SELECT } },
    });

    for (const record of attendanceRecords) {
      if (!record.checkIn || !record.shift) continue;

      const checkInMinutes = AttendanceHelper.timeStringToMinutes(record.checkIn);
      const lateMinutes = calculateLateMinutes(checkInMinutes, record.shift, durationType);
      const status =
        durationType === LeaveDurationType.HALF_DAY
          ? AttendanceStatus.HALF_DAY
          : AttendanceStatus.PRESENT;

      const metrics = record.checkOut
        ? calculateAttendanceMetrics(
            checkInMinutes,
            AttendanceHelper.timeStringToMinutes(record.checkOut),
            record.shift,
            durationType,
          )
        : { lateMinutes, status };

      await tx.attendance.update({ where: { id: record.id }, data: metrics });
    }
  }

  private async fetchUsersMapForLeaveRequest(leaveRequest: any): Promise<UsersMap> {
    return this.fetchUsersMap([
      leaveRequest?.createdById,
      ...(leaveRequest?.approvals?.map((approval: any) => approval.approverId) ?? []),
    ]);
  }

  private async fetchUsersMap(ids: (string | null | undefined)[]): Promise<UsersMap> {
    const uniqueIds = [...new Set(ids.filter(Boolean))] as string[];
    if (!uniqueIds.length) return {};

    const users = await this.prisma.user.findMany({
      where: { id: { in: uniqueIds } },
      select: USER_SELECT,
    });

    return Object.fromEntries(users.map((user) => [user.id, user]));
  }

  private serializeLeaveRequest(leaveRequest: any, usersMap: UsersMap): any {
    if (!leaveRequest) return leaveRequest;

    return {
      ...leaveRequest,
      totalDays: Number(leaveRequest.totalDays),
      createdBy: leaveRequest.createdById ? (usersMap[leaveRequest.createdById] ?? null) : null,
      approvals: leaveRequest.approvals.map((approval: any) => ({
        ...approval,
        approver: usersMap[approval.approverId] ?? null,
      })),
    };
  }

  async getMetricsForPeriod(
    employeeId: string,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<{ paidLeaveDays: number; unpaidLeaveDays: number; leaveDates: string[] }> {
    const leaves = await this.prisma.leaveRequest.findMany({
      where: {
        employeeId,
        startDate: { lte: periodEnd },
        endDate: { gte: periodStart },
        status: LeaveRequestStatus.APPROVED,
      },
      select: {
        startDate: true,
        endDate: true,
        totalDays: true,
        isPaid: true,
      },
    });

    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;
    const leaveDates = new Set<string>();

    for (const leave of leaves) {
      // totalDays is computed once at creation (see LeaveRequestService.resolveLeaveSchedule)
      // and already reflects the request's actual day span, so a 2-day request
      // contributes 2, not 1 — summing it here is what makes multi-day requests add up.
      const requestedDays = Number(leave.totalDays);

      if (leave.isPaid) {
        paidLeaveDays += requestedDays;
      } else {
        unpaidLeaveDays += requestedDays;
      }

      for (
        const date = new Date(leave.startDate);
        date <= leave.endDate;
        date.setDate(date.getDate() + 1)
      ) {
        leaveDates.add(date.toISOString().split("T")[0]);
      }
    }

    return { paidLeaveDays, unpaidLeaveDays, leaveDates: [...leaveDates] };
  }
}
