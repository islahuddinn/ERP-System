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

const PRODUCT_LOOKUP_SELECT = {
  id: true,
  name: true,
  code: true,
} satisfies Prisma.ProductSelect;

const TRANSFER_LOOKUP_SELECT = {
  id: true,
  transferNumber: true,
} satisfies Prisma.BranchStockTransferSelect;

const RETURN_ITEM_INCLUDE = {
  product: { select: PRODUCT_LOOKUP_SELECT },
} satisfies Prisma.BranchStockReturnItemInclude;

export const BRANCH_STOCK_RETURN_DETAIL_INCLUDE = {
  transfer: { select: TRANSFER_LOOKUP_SELECT },
  returningBranch: { select: BRANCH_LOOKUP_SELECT },
  receivingBranch: { select: BRANCH_LOOKUP_SELECT },
  requestedBy: { select: EMPLOYEE_LOOKUP_SELECT },
  approvedBy: { select: EMPLOYEE_LOOKUP_SELECT },
  items: { include: RETURN_ITEM_INCLUDE },
} satisfies Prisma.BranchStockReturnInclude;

export const BRANCH_STOCK_RETURN_LIST_INCLUDE = {
  transfer: { select: TRANSFER_LOOKUP_SELECT },
  returningBranch: { select: BRANCH_LOOKUP_SELECT },
  receivingBranch: { select: BRANCH_LOOKUP_SELECT },
  requestedBy: { select: EMPLOYEE_LOOKUP_SELECT },
  _count: { select: { items: true } },
} satisfies Prisma.BranchStockReturnInclude;
