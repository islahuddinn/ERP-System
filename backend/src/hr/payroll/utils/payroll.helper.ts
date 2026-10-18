import { Decimal } from "@prisma/client/runtime/library";

export class PayrollHelper {
  static calculateSalaryBreakdown(
    grossSalary: Decimal,
    totalCalendarDays: number,
  ): { salaryPerDay: Decimal; salaryPerHour: Decimal; salaryPerMinute: Decimal } {
    const salaryPerDay =
      totalCalendarDays === 0 ? new Decimal(0) : grossSalary.dividedBy(totalCalendarDays);
    const salaryPerHour = salaryPerDay.dividedBy(8);
    const salaryPerMinute = salaryPerHour.dividedBy(60);

    return { salaryPerDay, salaryPerHour, salaryPerMinute };
  }

  static calculateSalaryPerDay(grossSalary: Decimal, totalCalendarDays: number): Decimal {
    if (totalCalendarDays === 0) {
      return new Decimal(0);
    }
    return grossSalary.dividedBy(totalCalendarDays);
  }

  static calculateSalaryPerHour(salaryPerDay: Decimal): Decimal {
    return salaryPerDay.dividedBy(8);
  }

  static calculateSalaryPerMinute(salaryPerHour: Decimal): Decimal {
    return salaryPerHour.dividedBy(60);
  }

  static calculateAbsentDaysDeduction(absentDays: number, salaryPerDay: Decimal): Decimal {
    return salaryPerDay.times(absentDays);
  }

  static calculateTimingDeduction(timingMinutes: number, salaryPerMinute: Decimal): Decimal {
    return salaryPerMinute.times(timingMinutes);
  }

  static calculateUnpaidLeaveDeduction(unpaidLeaveDays: number, salaryPerDay: Decimal): Decimal {
    return salaryPerDay.times(unpaidLeaveDays);
  }

  static calculateAllowancesTotal(allowances: Array<{ amount: Decimal }>): Decimal {
    return allowances.reduce((total, allowance) => total.plus(allowance.amount), new Decimal(0));
  }
}
