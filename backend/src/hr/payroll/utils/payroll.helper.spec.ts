import { Decimal } from "@prisma/client/runtime/library";
import { PayrollHelper } from "./payroll.helper";

describe("PayrollHelper", () => {
  it("splits a monthly salary into day / hour / minute rates", () => {
    const { salaryPerDay, salaryPerHour, salaryPerMinute } = PayrollHelper.calculateSalaryBreakdown(
      new Decimal(31000),
      31,
    );

    expect(salaryPerDay.toNumber()).toBe(1000);
    expect(salaryPerHour.toNumber()).toBe(125);
    expect(Number(salaryPerMinute.toFixed(4))).toBeCloseTo(2.0833, 3);
  });

  it("returns zero rates when the period has no calendar days", () => {
    const breakdown = PayrollHelper.calculateSalaryBreakdown(new Decimal(50000), 0);
    expect(breakdown.salaryPerDay.toNumber()).toBe(0);
  });

  it("does not compound allowances when summing them", () => {
    const total = PayrollHelper.calculateAllowancesTotal([
      { amount: new Decimal(1000) },
      { amount: new Decimal(500.5) },
    ]);
    expect(total.toNumber()).toBe(1500.5);
  });

  it("charges absence, timing, and unpaid leave from the per-day rate", () => {
    const perDay = new Decimal(1000);
    const perMinute = new Decimal(2);

    expect(PayrollHelper.calculateAbsentDaysDeduction(2, perDay).toNumber()).toBe(2000);
    expect(PayrollHelper.calculateTimingDeduction(15, perMinute).toNumber()).toBe(30);
    expect(PayrollHelper.calculateUnpaidLeaveDeduction(1, perDay).toNumber()).toBe(1000);
  });
});
