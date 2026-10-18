import { Prisma } from "@prisma/tenant-client";

const SELLER_BRANCH_LOOKUP_SELECT = {
  id: true,
  name: true,
  code: true,
} satisfies Prisma.BranchSelect;

const PRODUCT_LOOKUP_SELECT = {
  id: true,
  name: true,
  code: true,
} satisfies Prisma.ProductSelect;

export const BRANCH_PRODUCT_PRICE_DETAIL_INCLUDE = {
  sellerBranch: { select: SELLER_BRANCH_LOOKUP_SELECT },
  product: { select: PRODUCT_LOOKUP_SELECT },
} satisfies Prisma.BranchProductPriceInclude;
