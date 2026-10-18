import { Decimal } from "@prisma/client/runtime/library";

export interface PayrollCalculation {
  grossSalary: Decimal;
  allowancesTotal: Decimal;
  salaryPerDay: Decimal;
  salaryPerHour: Decimal;
  salaryPerMinute: Decimal;
  totalCalendarDays: number;
  holidays: number;
  weekends: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  workingDays: Decimal;
  presentDays: number;
  absentDays: number;
  timingMinutes: number;
  absentDaysDeduction: Decimal;
  timingDeduction: Decimal;
  unpaidLeaveDeduction: Decimal;
  loanDeduction: Decimal;
  totalDeductions: Decimal;
  netPay: Decimal;
}

export interface AddBonusData {
  bonusAmount: Decimal;
  bonusReason: string | null;
  grossSalary: Decimal;
  netPay: Decimal;
  updatedById: string;
}
