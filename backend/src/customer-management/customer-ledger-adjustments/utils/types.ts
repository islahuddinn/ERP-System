import { Prisma } from "@prisma/tenant-client";
import { CUSTOMER_LEDGER_ADJUSTMENT_DETAIL_INCLUDE } from "./constants";

export type CustomerLedgerAdjustmentDetail = Prisma.CustomerLedgerAdjustmentGetPayload<{
  include: typeof CUSTOMER_LEDGER_ADJUSTMENT_DETAIL_INCLUDE;
}>;

export type CustomerLedgerAdjustmentListItem = CustomerLedgerAdjustmentDetail;
