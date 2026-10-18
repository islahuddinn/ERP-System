import { Prisma } from "@prisma/tenant-client";
import { BRANCH_STOCK_REQUEST_DETAIL_INCLUDE, BRANCH_STOCK_REQUEST_LIST_INCLUDE } from "./constants";

export type BranchStockRequestDetail = Prisma.BranchStockRequestGetPayload<{
  include: typeof BRANCH_STOCK_REQUEST_DETAIL_INCLUDE;
}>;

export type BranchStockRequestListItem = Prisma.BranchStockRequestGetPayload<{
  include: typeof BRANCH_STOCK_REQUEST_LIST_INCLUDE;
}>;
