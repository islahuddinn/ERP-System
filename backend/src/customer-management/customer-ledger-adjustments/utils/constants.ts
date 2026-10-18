import { Prisma } from "@prisma/tenant-client";

const CUSTOMER_LOOKUP_SELECT = {
  id: true,
  code: true,
  shopName: true,
} satisfies Prisma.CustomerSelect;

export const CUSTOMER_LEDGER_ADJUSTMENT_DETAIL_INCLUDE = {
  customer: { select: CUSTOMER_LOOKUP_SELECT },
} satisfies Prisma.CustomerLedgerAdjustmentInclude;

export const CUSTOMER_LEDGER_ADJUSTMENT_LIST_INCLUDE = CUSTOMER_LEDGER_ADJUSTMENT_DETAIL_INCLUDE;
