export const SYSTEM_ACCOUNT_CODES = {
  CASH: "1000",
  AR: "1100",
  INVENTORY: "1200",
  AP: "2000",
  PAYROLL_PAYABLE: "2100",
  SALES_REVENUE: "4000",
  COGS: "5000",
  SALARY_EXPENSE: "5100",
  OPERATING_EXPENSE: "5200",
  INVENTORY_VARIANCE: "5300",
  OPENING_EQUITY: "3000",
} as const;

export type SystemAccountKey = keyof typeof SYSTEM_ACCOUNT_CODES;

export const SYSTEM_ACCOUNT_DEFINITIONS: Record<
  SystemAccountKey,
  { accountName: string; accountType: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE"; normalBalance: "DEBIT" | "CREDIT" }
> = {
  CASH: { accountName: "Cash", accountType: "ASSET", normalBalance: "DEBIT" },
  AR: { accountName: "Accounts Receivable", accountType: "ASSET", normalBalance: "DEBIT" },
  INVENTORY: { accountName: "Inventory", accountType: "ASSET", normalBalance: "DEBIT" },
  AP: { accountName: "Accounts Payable", accountType: "LIABILITY", normalBalance: "CREDIT" },
  PAYROLL_PAYABLE: { accountName: "Payroll Payable", accountType: "LIABILITY", normalBalance: "CREDIT" },
  SALES_REVENUE: { accountName: "Sales Revenue", accountType: "REVENUE", normalBalance: "CREDIT" },
  COGS: { accountName: "Cost of Goods Sold", accountType: "EXPENSE", normalBalance: "DEBIT" },
  SALARY_EXPENSE: { accountName: "Salary Expense", accountType: "EXPENSE", normalBalance: "DEBIT" },
  OPERATING_EXPENSE: { accountName: "Operating Expense", accountType: "EXPENSE", normalBalance: "DEBIT" },
  INVENTORY_VARIANCE: { accountName: "Inventory Variance", accountType: "EXPENSE", normalBalance: "DEBIT" },
  OPENING_EQUITY: { accountName: "Opening Equity", accountType: "EQUITY", normalBalance: "CREDIT" },
};

export const JOURNAL_INCLUDE = {
  journalLines: {
    include: {
      account: true,
    },
  },
} as const;

export const MONEY_EPSILON = 0.01;
