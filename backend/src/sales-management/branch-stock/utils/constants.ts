import { Prisma } from "@prisma/tenant-client";

const BRANCH_LOOKUP_SELECT = {
  id: true,
  name: true,
  code: true,
} satisfies Prisma.BranchSelect;

const PRODUCT_LOOKUP_SELECT = {
  id: true,
  name: true,
  code: true,
} satisfies Prisma.ProductSelect;

export const BRANCH_STOCK_BALANCE_INCLUDE = {
  branch: { select: BRANCH_LOOKUP_SELECT },
  product: { select: PRODUCT_LOOKUP_SELECT },
} satisfies Prisma.BranchStockBalanceInclude;
