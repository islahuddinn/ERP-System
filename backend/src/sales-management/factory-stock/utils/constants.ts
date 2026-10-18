import { Prisma } from "@prisma/tenant-client";

const PRODUCT_LOOKUP_SELECT = {
  id: true,
  name: true,
  code: true,
} satisfies Prisma.ProductSelect;

export const FACTORY_STOCK_BALANCE_INCLUDE = {
  product: { select: PRODUCT_LOOKUP_SELECT },
} satisfies Prisma.FactoryStockBalanceInclude;
