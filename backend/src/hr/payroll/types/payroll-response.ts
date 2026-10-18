import { Prisma } from "@prisma/tenant-client";
import { PAYROLL_INCLUDE } from "../utils/constants";

export type PayrollResponse = Prisma.PayrollGetPayload<{
  include: typeof PAYROLL_INCLUDE;
}>;

export interface BulkPayrollResult {
  created: Array<{ payrollId: string; employeeId: string }>;
  failed: Array<{ employeeId: string; reason: string }>;
}

export type CreatePayrollResult = PayrollResponse | BulkPayrollResult;
