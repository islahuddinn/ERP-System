export const CUSTOMER_LEDGER_PERMISSIONS = {
  "customer-ledger.view": {
    module: "customer-ledger",
    action: "view",
    description: "View a shop's ledger and export it to CSV",
  },
} as const;
