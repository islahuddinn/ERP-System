import { Prisma } from "@prisma/tenant-client";

export const EMPLOYEE_CASH_LEDGER_HEADER_SELECT = {
  id: true,
  employeeCode: true,
  user: { select: { id: true, firstName: true, lastName: true, phone: true } },
} satisfies Prisma.EmployeeSelect;
