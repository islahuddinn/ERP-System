export const EMPLOYEE_CASH_LEDGER_PERMISSIONS = {
  "employee-cash-ledger.view": {
    module: "employee-cash-ledger",
    action: "view",
    description: "View your own cash ledger and current cash-in-hand balance",
  },
  "employee-cash-ledger.view-all": {
    module: "employee-cash-ledger",
    action: "view-all",
    description: "View any employee's cash ledger — finance/accounts/admin only",
  },
} as const;
