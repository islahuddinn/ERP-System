import { splitAmountIntoInstallments } from "./installment-calculations";
import { getMaxAllowedInstallmentAmount } from "./salary-eligibility";
import { SalaryFrequency } from "@prisma/tenant-client";

describe("splitAmountIntoInstallments", () => {
  it("splits evenly and puts leftover cents on the last installment", () => {
    expect(splitAmountIntoInstallments(100, 3)).toEqual([33.33, 33.33, 33.34]);
  });

  it("accounts for every cent of the principal", () => {
    const parts = splitAmountIntoInstallments(1000.07, 4);
    const sum = Math.round(parts.reduce((acc, n) => acc + n, 0) * 100) / 100;
    expect(sum).toBe(1000.07);
  });
});

describe("getMaxAllowedInstallmentAmount", () => {
  it("caps a monthly salary at the configured percent", () => {
    expect(getMaxAllowedInstallmentAmount(50000, SalaryFrequency.MONTHLY, 20)).toBe(10000);
  });

  it("converts a weekly salary to a monthly equivalent before capping", () => {
    const weekly = 10000;
    const expected = Math.round(((weekly * 52) / 12) * 0.25 * 100) / 100;
    expect(getMaxAllowedInstallmentAmount(weekly, SalaryFrequency.WEEKLY, 25)).toBe(expected);
  });
});
