import { Prisma } from "@prisma/tenant-client";
import { BRANCH_STOCK_RETURN_DETAIL_INCLUDE, BRANCH_STOCK_RETURN_LIST_INCLUDE } from "./constants";

export type BranchStockReturnDetail = Prisma.BranchStockReturnGetPayload<{
  include: typeof BRANCH_STOCK_RETURN_DETAIL_INCLUDE;
}>;

export type BranchStockReturnListItem = Prisma.BranchStockReturnGetPayload<{
  include: typeof BRANCH_STOCK_RETURN_LIST_INCLUDE;
}>;
