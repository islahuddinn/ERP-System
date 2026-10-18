import { Prisma } from "@prisma/tenant-client";

const CUSTOMER_LOOKUP_SELECT = {
  id: true,
  code: true,
  shopName: true,
} satisfies Prisma.CustomerSelect;

const PRODUCT_LOOKUP_SELECT = {
  id: true,
  code: true,
  name: true,
} satisfies Prisma.ProductSelect;

export const PRODUCT_ADJUSTMENT_DETAIL_INCLUDE = {
  customer: { select: CUSTOMER_LOOKUP_SELECT },
  product: { select: PRODUCT_LOOKUP_SELECT },
} satisfies Prisma.ProductAdjustmentInclude;

export const PRODUCT_ADJUSTMENT_LIST_INCLUDE = PRODUCT_ADJUSTMENT_DETAIL_INCLUDE;
