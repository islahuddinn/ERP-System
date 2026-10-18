import { Prisma } from "@prisma/tenant-client";

const BRANCH_LOOKUP_SELECT = {
  id: true,
  name: true,
  code: true,
  priceTier: true,
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

const REQUEST_ITEM_INCLUDE = {
  product: { select: PRODUCT_LOOKUP_SELECT },
} satisfies Prisma.BranchStockRequestItemInclude;

/**
 * Each transfer's items are included (not just the transfer header) so a
 * caller can tell how much of the request is still outstanding without a
 * second call — the same shape BranchStockRequestsRepository.
 * computeRemainingBalance uses internally to validate shipments.
 */
export const BRANCH_STOCK_REQUEST_DETAIL_INCLUDE = {
  requesterBranch: { select: BRANCH_LOOKUP_SELECT },
  fulfillerBranch: { select: BRANCH_LOOKUP_SELECT },
  requestedBy: { select: EMPLOYEE_LOOKUP_SELECT },
  approvedBy: { select: EMPLOYEE_LOOKUP_SELECT },
  items: { include: REQUEST_ITEM_INCLUDE },
  transfers: {
    select: {
      id: true,
      transferNumber: true,
      status: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          requestItemId: true,
          quantity: true,
          receivedQuantity: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  },
} satisfies Prisma.BranchStockRequestInclude;

export const BRANCH_STOCK_REQUEST_LIST_INCLUDE = {
  requesterBranch: { select: BRANCH_LOOKUP_SELECT },
  fulfillerBranch: { select: BRANCH_LOOKUP_SELECT },
  requestedBy: { select: EMPLOYEE_LOOKUP_SELECT },
  _count: { select: { items: true } },
} satisfies Prisma.BranchStockRequestInclude;
