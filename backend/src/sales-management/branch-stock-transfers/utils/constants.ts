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

const REQUEST_LOOKUP_SELECT = {
  id: true,
  requestNumber: true,
} satisfies Prisma.BranchStockRequestSelect;

const TRANSFER_ITEM_INCLUDE = {
  product: { select: PRODUCT_LOOKUP_SELECT },
} satisfies Prisma.BranchStockTransferItemInclude;

export const BRANCH_STOCK_TRANSFER_DETAIL_INCLUDE = {
  fromBranch: { select: BRANCH_LOOKUP_SELECT },
  toBranch: { select: BRANCH_LOOKUP_SELECT },
  request: { select: REQUEST_LOOKUP_SELECT },
  dispatchedBy: { select: EMPLOYEE_LOOKUP_SELECT },
  receivedBy: { select: EMPLOYEE_LOOKUP_SELECT },
  cancelledBy: { select: EMPLOYEE_LOOKUP_SELECT },
  items: { include: TRANSFER_ITEM_INCLUDE },
} satisfies Prisma.BranchStockTransferInclude;

export const BRANCH_STOCK_TRANSFER_LIST_INCLUDE = {
  fromBranch: { select: BRANCH_LOOKUP_SELECT },
  toBranch: { select: BRANCH_LOOKUP_SELECT },
  request: { select: REQUEST_LOOKUP_SELECT },
  _count: { select: { items: true } },
} satisfies Prisma.BranchStockTransferInclude;
