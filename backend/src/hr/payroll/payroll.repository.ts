import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { PayrollStatus, Prisma } from "@prisma/tenant-client";
import { PaginatedResponse, buildPaginatedResponse } from "src/common/dto/pagination.dto";
import { buildOrderBy, buildSearchFilter } from "src/common/utils/pagination.helper";
import { PayrollQueryDto } from "./dto/payroll-query.dto";
import { PAYROLL_INCLUDE } from "./utils/constants";
import { AddBonusData } from "./utils/types";

type PayrollDetail = Prisma.PayrollGetPayload<{ include: typeof PAYROLL_INCLUDE }>;

const PAYROLL_SORTABLE_FIELDS = [
  "paidMonth",
  "periodStart",
  "periodEnd",
  "grossSalary",
  "netPay",
  "status",
  "createdAt",
];

@Injectable()
export class PayrollRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(payrollQueryDto: PayrollQueryDto): Promise<PaginatedResponse<PayrollDetail>> {
    const {
      page = 1,
      limit = 10,
      employeeId,
      status,
      paidMonth,
      search,
      sortBy,
      sortOrder,
    } = payrollQueryDto;
    const skip = (page - 1) * limit;

    const where: Prisma.PayrollWhereInput = {};

    if (employeeId) where.employeeId = employeeId;
    if (status) where.status = status;
    if (paidMonth) where.paidMonth = paidMonth;

    if (search) {
      where.OR = [
        { employee: { employeeCode: { contains: search, mode: "insensitive" } } },
        { employee: { user: { OR: buildSearchFilter(search, ["firstName", "lastName"]) } } },
      ];
    }

    // Whitelist guards against Prisma validation errors (500) on arbitrary sortBy values
    const orderBy =
      sortBy && PAYROLL_SORTABLE_FIELDS.includes(sortBy)
        ? buildOrderBy(sortBy, sortOrder)
        : { createdAt: "desc" as const };

    const [data, total] = await Promise.all([
      this.prisma.payroll.findMany({
        where,
        include: PAYROLL_INCLUDE,
        skip,
        take: limit,
        orderBy,
      }),
      this.prisma.payroll.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, page, limit);
  }

  async findEmployeeIdByUserId(userId: string): Promise<string | null> {
    const employee = await this.prisma.employee.findUnique({
      where: { userId },
      select: { id: true },
    });

    return employee?.id ?? null;
  }

  async findById(payrollId: string): Promise<PayrollDetail | null> {
    return this.prisma.payroll.findUnique({
      where: { id: payrollId },
      include: PAYROLL_INCLUDE,
    });
  }

  async findByEmployeeAndPeriod(
    employeeId: string,
    periodStart: Date,
  ): Promise<PayrollDetail | null> {
    return this.prisma.payroll.findUnique({
      where: {
        employeeId_periodStart: {
          employeeId,
          periodStart,
        },
      },
      include: PAYROLL_INCLUDE,
    });
  }

  async create(payrollData: Prisma.PayrollCreateInput): Promise<PayrollDetail> {
    return this.prisma.payroll.create({
      data: payrollData,
      include: PAYROLL_INCLUDE,
    });
  }

  async update(payrollId: string, payrollData: Prisma.PayrollUpdateInput): Promise<PayrollDetail> {
    return this.prisma.payroll.update({
      where: { id: payrollId },
      data: payrollData,
      include: PAYROLL_INCLUDE,
    });
  }

  /**
   * Only transitions the row when it is still in `fromStatus`, so a concurrent
   * transition (e.g. approve racing with pay, or racing with addBonus) can't be overwritten.
   * Returns the number of rows updated (0 means the status already changed under us).
   */
  async updateStatus(
    payrollId: string,
    fromStatus: PayrollStatus,
    toStatus: PayrollStatus,
    approvedById?: string,
    paidAt?: Date,
  ): Promise<number> {
    const updateData: Prisma.PayrollUncheckedUpdateManyInput = { status: toStatus };

    if (approvedById) updateData.approvedById = approvedById;
    if (paidAt) updateData.paidAt = paidAt;

    const result = await this.prisma.payroll.updateMany({
      where: { id: payrollId, status: fromStatus },
      data: updateData,
    });

    return result.count;
  }

  /**
   * Only applies the bonus when the payroll is still DRAFT, so it can't silently
   * overwrite an amount that was just approved by a concurrent request.
   * Returns the number of rows updated (0 means it was approved before this ran).
   */
  async addBonus(payrollId: string, data: AddBonusData): Promise<number> {
    const result = await this.prisma.payroll.updateMany({
      where: { id: payrollId, status: PayrollStatus.DRAFT },
      data,
    });

    return result.count;
  }

  async getAttendanceMetrics(
    employeeId: string,
    periodStart: Date,
    periodEnd: Date,
    leaveDates: string[],
  ): Promise<{
    presentDays: number;
    absentDays: number;
    timingMinutes: number;
  }> {
    // Days covered by an approved leave request are excluded here — they're
    // accounted for separately via paidLeaveDays/unpaidLeaveDays so they never
    // also get counted (and deducted) as an uninformed absence.
    const attendanceRecords = await this.prisma.attendance.findMany({
      where: {
        employeeId,
        date: {
          gte: periodStart.toISOString().split("T")[0],
          lte: periodEnd.toISOString().split("T")[0],
          notIn: leaveDates,
        },
      },
      select: {
        workedMinutes: true,
        lateMinutes: true,
      },
    });

    let presentDays = 0;
    let absentDays = 0;
    let totalTimingMinutes = 0;

    for (const record of attendanceRecords) {
      if (record.workedMinutes && record.workedMinutes > 0) {
        presentDays += 1;
        totalTimingMinutes += record.lateMinutes || 0;
      } else {
        absentDays += 1;
      }
    }

    return {
      presentDays,
      absentDays,
      timingMinutes: totalTimingMinutes,
    };
  }

  async getActiveContract(
    employeeId: string,
    periodStart: Date,
  ): Promise<{
    id: string;
    salaryRevisions: Array<{
      id: string;
      baseSalary: Prisma.Decimal;
      salaryFrequency: string;
      effectiveDate: Date;
      status: string;
    }>;
    allowances: Array<{
      allowanceType: string;
      amount: Prisma.Decimal;
    }>;
  } | null> {
    return this.prisma.employeeContract.findFirst({
      where: {
        employeeId,
        startDate: { lte: periodStart },
        OR: [{ endDate: null }, { endDate: { gte: periodStart } }],
      },
      select: {
        id: true,
        salaryRevisions: {
          where: {
            effectiveDate: { lte: periodStart },
            status: "CURRENT",
          },
          select: {
            id: true,
            baseSalary: true,
            salaryFrequency: true,
            effectiveDate: true,
            status: true,
          },
        },
        allowances: {
          select: {
            allowanceType: true,
            amount: true,
          },
        },
      },
    });
  }
}
