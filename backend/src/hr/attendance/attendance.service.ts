import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import {
  AttendanceSource,
  AttendanceStatus,
  EmployeeStatus,
  LeaveDurationType,
  Prisma,
  WorkMode,
} from "@prisma/tenant-client";
import { AuditContextService } from "../../audit/audit-context.service";
import { AttendanceRepository } from "./attendance.repository";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { CheckInDto } from "./dto/check-in.dto";
import { CheckOutDto } from "./dto/check-out.dto";
import { UpdateAttendanceDto } from "./dto/update-attendance.dto";
import { AttendanceFiltersDto } from "./dto/attendance-filters.dto";
import { RequestWithUser } from "../../common/interfaces";
import { calculateLateMinutes } from "./utils/attendance-calculator.util";
import { ShiftSnapshot } from "./utils/interfaces";
import { AttendanceHelper } from "./utils/attendance.helper";
import { AttendanceDetail, AttendanceListItem } from "./utils/types";

@Injectable()
export class AttendanceService {
  constructor(
    private readonly attendanceRepository: AttendanceRepository,
    private readonly auditContext: AuditContextService,
  ) {}

  async listAttendance(
    attendanceFiltersDto: AttendanceFiltersDto,
    canViewAll: boolean,
    requestingUserId: string,
  ): Promise<PaginatedResponse<AttendanceListItem>> {
    if (canViewAll) {
      return this.attendanceRepository.findAll(attendanceFiltersDto);
    }

    const employeeId = await this.resolveRequestingEmployeeId(requestingUserId);
    return this.attendanceRepository.findAll({ ...attendanceFiltersDto, employeeId });
  }

  async findOne(
    attendanceId: string,
    canViewAll: boolean,
    requestingUserId: string,
  ): Promise<AttendanceDetail> {
    const record = await this.checkExistence(attendanceId);

    if (canViewAll) return record;

    const employeeId = await this.resolveRequestingEmployeeId(requestingUserId);

    if (record.employee.id !== employeeId) {
      throw new NotFoundException("Attendance record not found");
    }

    return record;
  }

  async checkIn(checkInDto: CheckInDto, req: RequestWithUser): Promise<AttendanceDetail> {
    const { id: userId } = req.user;
    const { employeeId, date, workMode, source, notes } = checkInDto;

    const checkIn = AttendanceHelper.normalizeTimeString(checkInDto.checkIn);

    const employee = await this.attendanceRepository.findEmployeeWithShift(employeeId);

    if (!employee) {
      throw new NotFoundException(`Employee not found`);
    }

    if (employee.status !== EmployeeStatus.ACTIVE) {
      throw new BadRequestException(`Cannot check in an employee with status ${employee.status}`);
    }

    // Reject future-dated check-ins (#14).
    if (date > AttendanceHelper.todayString()) {
      throw new BadRequestException(`Check-in date cannot be in the future`);
    }

    // Reject check-ins dated before the employee's joining date (#15).
    const joiningDate = AttendanceHelper.dateToDateString(employee.dateOfJoining);
    if (date < joiningDate) {
      throw new BadRequestException(
        `Check-in date cannot be before the employee's joining date (${joiningDate})`,
      );
    }

    const { shift } = employee;

    if (!shift) {
      throw new BadRequestException(
        `Employee has no shift assigned. Assign a shift before recording attendance.`,
      );
    }

    const existing = await this.attendanceRepository.findByEmployeeAndDate(employeeId, date);

    if (existing) {
      throw new BadRequestException(`Employee already has an attendance record for this date`);
    }

    const [approvedLeave, holiday] = await Promise.all([
      this.attendanceRepository.findApprovedLeaveForDate(employeeId, date),
      this.attendanceRepository.findHolidayForDate(date),
    ]);

    if (holiday) {
      throw new BadRequestException(
        `Cannot check in — "${holiday.name}" is a holiday on this date`,
      );
    }

    if (approvedLeave?.durationType === LeaveDurationType.FULL_DAY) {
      throw new BadRequestException(
        "User has an approved full-day leave for this date and cannot check in",
      );
    }

    const checkInMinutes = AttendanceHelper.timeStringToMinutes(checkIn);
    const lateMinutes = calculateLateMinutes(
      checkInMinutes,
      shift,
      approvedLeave?.durationType ?? null,
    );

    const payload: Prisma.AttendanceCreateInput = {
      employee: { connect: { id: employeeId } },
      shift: { connect: { id: shift.id } },
      date,
      checkIn,
      lateMinutes,
      status:
        approvedLeave?.durationType === LeaveDurationType.HALF_DAY
          ? AttendanceStatus.HALF_DAY
          : AttendanceStatus.PRESENT,
      workMode: workMode ?? WorkMode.ON_SITE,
      source: source ?? AttendanceSource.MANUAL,
      notes: notes ?? null,
      createdById: userId,
    };

    return this.attendanceRepository.create(payload);
  }

  async checkOut(
    attendanceId: string,
    checkOutDto: CheckOutDto,
    req: RequestWithUser,
  ): Promise<AttendanceDetail> {
    const { id: updatedById } = req.user;

    const existing = await this.checkExistence(attendanceId);

    if (existing.checkOut) {
      throw new BadRequestException(`Employee has already checked out for this date`);
    }

    const { checkIn, shift, date, employee } = existing;

    const checkOut = AttendanceHelper.normalizeTimeString(checkOutDto.checkOut);

    if (checkOut === checkIn) {
      throw new BadRequestException(`Check-out time cannot be the same as check-in time`);
    }

    // Check-out must be after check-in (#23). Overnight shifts legitimately have a
    // clock time "earlier" than check-in, so only guard non-midnight-crossing shifts.
    if (checkIn && !shift?.crossesMidnight && this.isCheckOutBeforeCheckIn(checkIn, checkOut)) {
      throw new BadRequestException(`Check-out time cannot be earlier than check-in time`);
    }

    const approvedLeave = await this.attendanceRepository.findApprovedLeaveForDate(
      employee.id,
      date,
    );

    const metrics = AttendanceHelper.computeMetricsIfComplete(
      checkIn,
      checkOut,
      shift,
      approvedLeave?.durationType ?? null,
    );

    const updateData: Prisma.AttendanceUpdateInput = { checkOut, ...metrics, updatedById };

    this.auditContext.setOldValue(existing);

    return this.attendanceRepository.update(attendanceId, updateData);
  }

  async updateAttendance(
    attendanceId: string,
    updateAttendanceDto: UpdateAttendanceDto,
    req: RequestWithUser,
  ): Promise<AttendanceDetail> {
    const { id: updatedById } = req.user;
    const existing = await this.checkExistence(attendanceId);

    const { checkIn, checkOut, workMode, source, notes } = updateAttendanceDto;

    const finalCheckIn = checkIn ? AttendanceHelper.normalizeTimeString(checkIn) : existing.checkIn;

    const finalCheckOut = checkOut
      ? AttendanceHelper.normalizeTimeString(checkOut)
      : existing.checkOut;

    if (finalCheckIn && finalCheckOut && finalCheckOut === finalCheckIn) {
      throw new BadRequestException(`Check-out time cannot be the same as check-in time`);
    }

    const shift = existing.shift as ShiftSnapshot | null;

    // Check-out must be after check-in for non-overnight shifts (#23).
    if (
      finalCheckIn &&
      finalCheckOut &&
      !shift?.crossesMidnight &&
      this.isCheckOutBeforeCheckIn(finalCheckIn, finalCheckOut)
    ) {
      throw new BadRequestException(`Check-out time cannot be earlier than check-in time`);
    }

    const approvedLeave = await this.attendanceRepository.findApprovedLeaveForDate(
      existing.employee.id,
      existing.date,
    );

    const metrics = AttendanceHelper.computeMetricsIfComplete(
      finalCheckIn,
      finalCheckOut,
      shift,
      approvedLeave?.durationType ?? null,
    );

    const updateData: Prisma.AttendanceUpdateInput = {
      ...(checkIn && { checkIn: finalCheckIn }),
      ...(checkOut && { checkOut: finalCheckOut }),
      ...(workMode && { workMode }),
      ...(source && { source }),
      ...(notes !== undefined && { notes }),
      ...metrics,
      updatedById,
    };

    this.auditContext.setOldValue(existing);

    return this.attendanceRepository.update(attendanceId, updateData);
  }

  async deleteAttendance(attendanceId: string): Promise<void> {
    const existing = await this.checkExistence(attendanceId);
    this.auditContext.setOldValue(existing);
    await this.attendanceRepository.delete(attendanceId);
  }

  async checkExistence(attendanceId: string): Promise<AttendanceDetail> {
    const record = await this.attendanceRepository.findDetailById(attendanceId);

    if (!record) {
      throw new NotFoundException("Attendance record not found");
    }

    return record;
  }

  /** True when the check-out clock time is strictly before the check-in clock time (same day). */
  private isCheckOutBeforeCheckIn(checkIn: string, checkOut: string): boolean {
    return (
      AttendanceHelper.timeStringToMinutes(checkOut) <
      AttendanceHelper.timeStringToMinutes(checkIn)
    );
  }

  private async resolveRequestingEmployeeId(userId: string): Promise<string> {
    const employeeId = await this.attendanceRepository.findEmployeeIdByUserId(userId);

    if (!employeeId) {
      throw new NotFoundException("No employee record is linked to your account");
    }

    return employeeId;
  }
}
