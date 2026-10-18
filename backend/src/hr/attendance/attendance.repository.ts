import { Injectable } from "@nestjs/common";
import {
  Attendance,
  AttendanceStatus,
  EmployeeStatus,
  LeaveDurationType,
  LeaveRequestStatus,
  Prisma,
} from "@prisma/tenant-client";
import { PrismaService } from "../../prisma/prisma.service";
import { buildPaginatedResponse, PaginatedResponse } from "../../common/dto/pagination.dto";
import {
  buildOrderBy,
  buildSearchFilter,
  getPaginationParams,
} from "../../common/utils/pagination.helper";
import { AttendanceFiltersDto } from "./dto/attendance-filters.dto";
import { AttendanceHelper } from "./utils/attendance.helper";
import { ATTENDANCE_INCLUDE, EMPLOYEE_SHIFT_SELECT } from "./utils/constants";
import { AttendanceDetail, AttendanceListItem, EmployeeShift } from "./utils/types";

const ATTENDANCE_SORTABLE_FIELDS = [
  "date",
  "checkIn",
  "checkOut",
  "status",
  "lateMinutes",
  "createdAt",
  // Nested relation fields — buildOrderBy folds the dotted path into the nested
  // shape Prisma requires ({ employee: { user: { firstName } } }, { shift: { name } }).
  "employee.user.firstName",
  "shift.name",
];

@Injectable()
export class AttendanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  private async enrichWithUsers(attendance: AttendanceListItem): Promise<AttendanceDetail> {
    const { createdById, updatedById } = attendance;

    const userIds = [createdById, updatedById].filter(Boolean) as string[];

    if (!userIds.length) {
      return { ...attendance, createdBy: null, updatedBy: null };
    }

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    const usersMap = Object.fromEntries(users.map((u) => [u.id, u]));

    return {
      ...attendance,
      createdBy: createdById ? (usersMap[createdById] ?? null) : null,
      updatedBy: updatedById ? (usersMap[updatedById] ?? null) : null,
    };
  }

  async findByEmployeeAndDate(employeeId: string, date: string): Promise<Attendance | null> {
    return this.prisma.attendance.findUnique({
      where: { employeeId_date: { employeeId, date } },
    });
  }

  async findDetailById(attendanceId: string): Promise<AttendanceDetail | null> {
    const record = await this.prisma.attendance.findUnique({
      where: { id: attendanceId },
      include: ATTENDANCE_INCLUDE,
    });

    if (!record) return null;

    return this.enrichWithUsers(record);
  }

  async create(data: Prisma.AttendanceCreateInput): Promise<AttendanceDetail> {
    const record = await this.prisma.attendance.create({ data, include: ATTENDANCE_INCLUDE });

    return this.enrichWithUsers(record);
  }

  async update(
    attendanceId: string,
    data: Prisma.AttendanceUpdateInput,
  ): Promise<AttendanceDetail> {
    const record = await this.prisma.attendance.update({
      where: { id: attendanceId },
      data,
      include: ATTENDANCE_INCLUDE,
    });
    return this.enrichWithUsers(record);
  }

  async findAll(
    attendanceFiltersDto: AttendanceFiltersDto,
  ): Promise<PaginatedResponse<AttendanceListItem>> {
    const {
      employeeId,
      date,
      yearMonth,
      search,
      status,
      sortBy,
      sortOrder,
      page = 1,
      limit = 10,
    } = attendanceFiltersDto;
    const { skip, take } = getPaginationParams(page, limit);
    const where: Prisma.AttendanceWhereInput = {};

    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status as AttendanceStatus;

    if (date) {
      where.date = date;
    } else if (yearMonth) {
      const [filterYear, filterMonth] = yearMonth.split("-").map(Number);
      where.date = AttendanceHelper.buildMonthDateRange(filterYear, filterMonth);
    }

    if (search) {
      where.OR = [
        { employee: { user: { OR: buildSearchFilter(search, ["firstName", "lastName"]) } } },
        { employee: { employeeCode: { contains: search, mode: "insensitive" } } },
        { shift: { OR: buildSearchFilter(search, ["name", "description"]) } },
      ];
    }

    // Whitelist guards against Prisma validation errors (500) on arbitrary sortBy values
    const orderBy =
      sortBy && ATTENDANCE_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : [{ date: "desc" as const }, { checkIn: "asc" as const }];

    const [data, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        skip,
        take,
        include: ATTENDANCE_INCLUDE,
        orderBy,
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async delete(attendanceId: string): Promise<void> {
    await this.prisma.attendance.delete({ where: { id: attendanceId } });
  }

  async findEmployeeWithShift(employeeId: string): Promise<{
    id: string;
    status: EmployeeStatus;
    dateOfJoining: Date;
    shift: EmployeeShift | null;
  } | null> {
    return this.prisma.employee.findUnique({
      where: { id: employeeId },
      select: {
        id: true,
        status: true,
        dateOfJoining: true,
        shift: { select: EMPLOYEE_SHIFT_SELECT },
      },
    });
  }

  async findEmployeeIdByUserId(userId: string): Promise<string | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });
    return employee?.id ?? null;
  }

  /**
   * Direct query against the leave-request table (not a service call) so the
   * attendance module never depends on the leave-request module — mirrors the
   * leave-request repository's direct query against employeeContract for quota
   * deduction. Returns the leave's durationType if an APPROVED leave covers the
   * given date for this employee, otherwise null.
   */
  async findApprovedLeaveForDate(
    employeeId: string,
    date: string,
  ): Promise<{ durationType: LeaveDurationType } | null> {
    const leave = await this.prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: LeaveRequestStatus.APPROVED,
        startDate: { lte: new Date(date) },
        endDate: { gte: new Date(date) },
      },
      select: { durationType: true },
    });

    return leave;
  }

  /**
   * Direct query against the holiday table (not a service call) for the same
   * reason as findApprovedLeaveForDate above — keeps the attendance module
   * independent of the holiday module. Returns the holiday's name if one
   * covers the given date, otherwise null.
   */
  async findHolidayForDate(date: string): Promise<{ name: string } | null> {
    const holiday = await this.prisma.holiday.findFirst({
      where: {
        startDate: { lte: new Date(date) },
        endDate: { gte: new Date(date) },
      },
      select: { name: true },
    });

    return holiday;
  }
}
