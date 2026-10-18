import { Prisma } from "@prisma/tenant-client";

export const PRODUCT_BONUS_GROUP_PRODUCT_SELECT = {
  id: true,
  code: true,
  name: true,
  isActive: true,
} satisfies Prisma.ProductSelect;

export const PRODUCT_BONUS_GROUP_LIST_INCLUDE = {
  _count: { select: { products: true } },
} satisfies Prisma.ProductBonusGroupInclude;

export const PRODUCT_BONUS_GROUP_DETAIL_INCLUDE = {
  products: {
    include: {
      product: { select: PRODUCT_BONUS_GROUP_PRODUCT_SELECT },
    },
    orderBy: { product: { name: "asc" as const } },
  },
} satisfies Prisma.ProductBonusGroupInclude;
