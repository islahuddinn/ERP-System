import { Prisma } from "@prisma/tenant-client";
import { BRANCH_PRODUCT_PRICE_DETAIL_INCLUDE } from "./constants";

export type BranchProductPriceDetail = Prisma.BranchProductPriceGetPayload<{
  include: typeof BRANCH_PRODUCT_PRICE_DETAIL_INCLUDE;
}>;
