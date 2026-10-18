export const FINANCE_PERMISSIONS = {
  "finance.view": {
    module: "finance",
    action: "view",
    description: "View financial records and summaries",
  },
  "finance.manage_accounts": {
    module: "finance",
    action: "manage_accounts",
    description: "Create and manage chart of accounts",
  },
  "finance.create_journal": {
    module: "finance",
    action: "create_journal",
    description: "Create journal entries",
  },
  "finance.approve_journal": {
    module: "finance",
    action: "approve_journal",
    description: "Approve journal entries",
  },
  "finance.view_reports": {
    module: "finance",
    action: "view_reports",
    description: "View financial reports (P&L, balance sheet, cash flow)",
  },
  "finance.export": {
    module: "finance",
    action: "export",
    description: "Export financial data",
  },
  "finance.manage": {
    module: "finance",
    action: "manage",
    description: "Create, update and delete AP, AR, cash, asset, and budget records",
  },
} as const;
