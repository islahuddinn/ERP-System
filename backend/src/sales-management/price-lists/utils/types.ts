import { Prisma } from "@prisma/tenant-client";
import { PRODUCT_PRICE_LIST_SELECT } from "./constants";

export type ProductWithPriceListEntries = Prisma.ProductGetPayload<{
  select: typeof PRODUCT_PRICE_LIST_SELECT;
}>;

export type PriceListTierValue = {
  id: string;
  price: number;
  updatedAt: Date;
};

// One row per product, with all 4 tiers nested underneath — null for any
// tier nobody has priced yet.
export type ProductPriceListEntry = {
  productId: string;
  productName: string;
  productCode: string;
  prices: {
    factoryPrice: PriceListTierValue | null;
    distributorPrice: PriceListTierValue | null;
    tradePrice: PriceListTierValue | null;
    mrp: PriceListTierValue | null;
  };
};
