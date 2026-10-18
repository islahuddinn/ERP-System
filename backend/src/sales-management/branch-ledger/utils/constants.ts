import { Prisma } from "@prisma/tenant-client";

const BRANCH_LOOKUP_SELECT = {
  id: true,
  name: true,
  code: true,
} satisfies Prisma.BranchSelect;

const EMPLOYEE_LOOKUP_SELECT = {
  id: true,
  employeeCode: true,
  user: { select: { id: true, firstName: true, lastName: true, phone: true } },
} satisfies Prisma.EmployeeSelect;

export const BRANCH_LEDGER_ENTRY_INCLUDE = {
  branch: { select: BRANCH_LOOKUP_SELECT },
  counterparty: { select: BRANCH_LOOKUP_SELECT },
} satisfies Prisma.BranchLedgerInclude;

// Used to compute the "who personally owes whom" view: transfers where
// either I'm the current distributor of the branch that owes (toBranch), or
// I'm the one who dispatched them (the fixed payee for that debt forever,
// per EmployeeCashTransferService.assertSettlesTransferDebt).
export const DEBT_TRANSFER_INCLUDE = {
  toBranch: {
    select: { ...BRANCH_LOOKUP_SELECT, distributor: { select: EMPLOYEE_LOOKUP_SELECT } },
  },
  dispatchedBy: { select: EMPLOYEE_LOOKUP_SELECT },
} satisfies Prisma.BranchStockTransferInclude;
