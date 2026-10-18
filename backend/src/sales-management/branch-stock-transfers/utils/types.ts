import { Prisma } from "@prisma/tenant-client";
import {
  BRANCH_STOCK_TRANSFER_DETAIL_INCLUDE,
  BRANCH_STOCK_TRANSFER_LIST_INCLUDE,
} from "./constants";

export type BranchStockTransferDetail = Prisma.BranchStockTransferGetPayload<{
  include: typeof BRANCH_STOCK_TRANSFER_DETAIL_INCLUDE;
}>;

export type BranchStockTransferListItem = Prisma.BranchStockTransferGetPayload<{
  include: typeof BRANCH_STOCK_TRANSFER_LIST_INCLUDE;
}>;

// Detail response shape only — amountDue is computed on read (BranchLedger
// debit minus credit for this transfer), never stored on the row itself.
export type BranchStockTransferWithAmountDue = BranchStockTransferDetail & {
  amountDue: number;
};
