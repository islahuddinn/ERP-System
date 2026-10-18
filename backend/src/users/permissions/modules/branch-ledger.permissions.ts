export const BRANCH_LEDGER_PERMISSIONS = {
  "branch-ledger.view": {
    module: "branch-ledger",
    action: "view",
    description: "View my own branch's ledger and profit/loss",
  },
  "branch-ledger.view-all": {
    module: "branch-ledger",
    action: "view-all",
    description: "View any employee's stock-transfer debts — finance/accounts/admin only",
  },
} as const;
