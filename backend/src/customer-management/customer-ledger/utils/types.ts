import { CustomerLedger, Prisma } from "@prisma/tenant-client";
import { PaginatedResponse } from "../../../common/dto/pagination.dto";
import { CUSTOMER_LEDGER_HEADER_SELECT } from "./constants";

export type CustomerLedgerHeader = Prisma.CustomerGetPayload<{
  select: typeof CUSTOMER_LEDGER_HEADER_SELECT;
}>;

export type CustomerLedgerEntryWithBalance = CustomerLedger & { balance: number };

export interface CustomerLedgerSummary {
  totalDeliveries: number;
  totalRecoveries: number;
  totalReturns: number;
  currentBalance: number;
  totalEntries: number;
}

export interface CustomerLedgerResponse {
  customer: CustomerLedgerHeader;
  summary: CustomerLedgerSummary;
  ledger: PaginatedResponse<CustomerLedgerEntryWithBalance>;
}
