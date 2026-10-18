import { Decimal } from '@prisma/client/runtime/library';
import { ApiProperty } from '@nestjs/swagger';

export class PayrollResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  employeeId: string;

  @ApiProperty()
  periodStart: Date;

  @ApiProperty()
  periodEnd: Date;

  @ApiProperty()
  paidMonth: string;

  @ApiProperty()
  grossSalary: Decimal;

  @ApiProperty()
  salaryPerDay: Decimal;

  @ApiProperty()
  salaryPerHour: Decimal;

  @ApiProperty()
  salaryPerMinute: Decimal;

  @ApiProperty()
  totalCalendarDays: number;

  @ApiProperty()
  holidays: number;

  @ApiProperty()
  weekends: number;

  @ApiProperty()
  paidLeaveDays: Decimal;

  @ApiProperty()
  unpaidLeaveDays: Decimal;

  @ApiProperty()
  workingDays: Decimal;

  @ApiProperty()
  presentDays: Decimal;

  @ApiProperty()
  absentDays: number;

  @ApiProperty()
  timingMinutes: number;

  @ApiProperty()
  absentDaysDeduction: Decimal;

  @ApiProperty()
  timingDeduction: Decimal;

  @ApiProperty()
  unpaidLeaveDeduction: Decimal;

  @ApiProperty()
  loanDeduction: Decimal;

  @ApiProperty()
  totalDeductions: Decimal;

  @ApiProperty()
  netPay: Decimal;

  @ApiProperty()
  status: string;

  @ApiProperty({ required: false })
  approvedById?: string;

  @ApiProperty({ required: false })
  approvedAt?: Date;

  @ApiProperty({ required: false })
  paidAt?: Date;

  @ApiProperty()
  createdBy: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedBy: string;

  @ApiProperty()
  updatedAt: Date;
}
