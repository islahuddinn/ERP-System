export interface BranchLedgerSummary {
  branchId: string;
  // Currently outstanding — debit minus credit — never a lifetime total.
  owedToParent: number;
  owedFromChildren: number;
  // Lifetime totals, accrual-basis: recognized the moment stock is
  // received, independent of what's actually been paid so far.
  totalChargedByParent: number;
  totalChargedToChildren: number;
  profitLoss: number;
}

export interface EmployeeDebtEntry {
  transferId: string;
  transferNumber: string;
  branchId: string;
  branchName: string;
  counterpartyEmployeeId: string;
  counterpartyEmployeeName: string;
  amountDue: number;
  receivedAt: Date | null;
}

// Computed, never stored — see BranchLedgerRepository.findMyDebts. iOwe:
// branches I currently distribute for that still owe on a received transfer,
// paid to whoever dispatched it (fixed forever, doesn't move if I get
// replaced as distributor). owedToMe: transfers I personally dispatched,
// still owed by whoever currently distributes for the receiving branch.
export interface EmployeeDebtsSummary {
  employeeId: string;
  iOwe: EmployeeDebtEntry[];
  owedToMe: EmployeeDebtEntry[];
  totalIOwe: number;
  totalOwedToMe: number;
}
