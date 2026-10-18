import { Prisma } from "@prisma/tenant-client";

const EMPLOYEE_LOOKUP_SELECT = {
  id: true,
  employeeCode: true,
  user: { select: { id: true, firstName: true, lastName: true, phone: true } },
} satisfies Prisma.EmployeeSelect;

const BRANCH_LOOKUP_SELECT = {
  id: true,
  name: true,
  code: true,
} satisfies Prisma.BranchSelect;

const SETTLES_TRANSFER_LOOKUP_SELECT = {
  id: true,
  transferNumber: true,
  toBranch: { select: BRANCH_LOOKUP_SELECT },
} satisfies Prisma.BranchStockTransferSelect;

export const EMPLOYEE_CASH_TRANSFER_DETAIL_INCLUDE = {
  fromEmployee: { select: EMPLOYEE_LOOKUP_SELECT },
  toEmployee: { select: EMPLOYEE_LOOKUP_SELECT },
  settlesTransfer: { select: SETTLES_TRANSFER_LOOKUP_SELECT },
} satisfies Prisma.EmployeeCashTransferInclude;

export const EMPLOYEE_CASH_TRANSFER_LIST_INCLUDE = EMPLOYEE_CASH_TRANSFER_DETAIL_INCLUDE;
