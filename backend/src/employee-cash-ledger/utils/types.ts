import { EmployeeCashLedger, Prisma } from "@prisma/tenant-client";
import { PaginatedResponse } from "../../common/dto/pagination.dto";
import { EMPLOYEE_CASH_LEDGER_HEADER_SELECT } from "./constants";

export type EmployeeCashLedgerHeader = Prisma.EmployeeGetPayload<{
  select: typeof EMPLOYEE_CASH_LEDGER_HEADER_SELECT;
}>;

export type EmployeeCashLedgerEntryWithBalance = EmployeeCashLedger & { balance: number };

export interface EmployeeCashLedgerSummary {
  totalCollected: number;
  totalReceived: number;
  totalTransferredOut: number;
  currentCashInHand: number;
  // Positive: this employee owes more for stock than they're owed. Kept
  // separate from currentCashInHand — it's stock value owed, not cash held.
  netStockDebt: number;
  totalEntries: number;
}

export interface EmployeeCashLedgerResponse {
  employee: EmployeeCashLedgerHeader;
  summary: EmployeeCashLedgerSummary;
  ledger: PaginatedResponse<EmployeeCashLedgerEntryWithBalance>;
}
