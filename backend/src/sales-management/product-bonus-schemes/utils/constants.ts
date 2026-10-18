import { Prisma } from "@prisma/tenant-client";

export const PRODUCT_BONUS_SCHEME_GROUP_SELECT = {
  id: true,
  code: true,
  name: true,
  status: true,
  _count: { select: { products: true } },
} satisfies Prisma.ProductBonusGroupSelect;

export const PRODUCT_BONUS_SCHEME_LIST_INCLUDE = {
  productBonusGroup: { select: PRODUCT_BONUS_SCHEME_GROUP_SELECT },
} satisfies Prisma.ProductBonusSchemeInclude;

export const PRODUCT_BONUS_SCHEME_DETAIL_INCLUDE = PRODUCT_BONUS_SCHEME_LIST_INCLUDE;
