import { Prisma } from "@prisma/tenant-client";
import { BRANCH_STOCK_BALANCE_INCLUDE } from "./constants";

export type BranchStockBalanceDetail = Prisma.BranchStockBalanceGetPayload<{
  include: typeof BRANCH_STOCK_BALANCE_INCLUDE;
}>;
