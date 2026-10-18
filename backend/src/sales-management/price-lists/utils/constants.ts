import { Prisma } from "@prisma/tenant-client";

const PRICE_LIST_ENTRY_FOR_PRODUCT_SELECT = {
  id: true,
  tier: true,
  price: true,
  updatedAt: true,
} satisfies Prisma.PriceListEntrySelect;

// Used to list price lists grouped by product — one row per product with all
// 4 tiers nested underneath, instead of one row per (tier, product) pair.
export const PRODUCT_PRICE_LIST_SELECT = {
  id: true,
  name: true,
  code: true,
  priceListEntries: { select: PRICE_LIST_ENTRY_FOR_PRODUCT_SELECT },
} satisfies Prisma.ProductSelect;
