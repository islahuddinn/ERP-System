import { SalaryFrequency } from "@prisma/tenant-client";

// Loan installments are always deducted monthly (see LoanRequestRepository's
// generateInstallments), so a periodic base salary must be converted to its
// monthly equivalent before it can be compared against an installment amount.
// DAILY/HOURLY rates depend on days/hours actually worked, which isn't tracked
// on the salary revision, so they're compared as-is (best effort).
const MONTHLY_SALARY_MULTIPLIER: Record<SalaryFrequency, number> = {
  MONTHLY: 1,
  WEEKLY: 52 / 12,
  BIWEEKLY: 26 / 12,
  DAILY: 1,
  HOURLY: 1,
};

// The highest amount a single loan installment may be, given the employee's
// current salary and the tenant-configured maxLoanInstallmentPercent cap.
export function getMaxAllowedInstallmentAmount(
  baseSalary: number,
  salaryFrequency: SalaryFrequency,
  maxLoanInstallmentPercent: number,
): number {
  const monthlySalary = baseSalary * MONTHLY_SALARY_MULTIPLIER[salaryFrequency];
  return Math.round(monthlySalary * (maxLoanInstallmentPercent / 100) * 100) / 100;
}
