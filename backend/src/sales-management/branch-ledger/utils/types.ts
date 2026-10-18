import { Prisma } from "@prisma/tenant-client";
import { BRANCH_LEDGER_ENTRY_INCLUDE, DEBT_TRANSFER_INCLUDE } from "./constants";

export type BranchLedgerEntryDetail = Prisma.BranchLedgerGetPayload<{
  include: typeof BRANCH_LEDGER_ENTRY_INCLUDE;
}>;

export type DebtTransfer = Prisma.BranchStockTransferGetPayload<{
  include: typeof DEBT_TRANSFER_INCLUDE;
}>;
