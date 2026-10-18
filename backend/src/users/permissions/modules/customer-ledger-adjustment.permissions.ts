export const CUSTOMER_LEDGER_ADJUSTMENT_PERMISSIONS = {
  "customer-ledger-adjustment.view": {
    module: "customer-ledger-adjustment",
    action: "view",
    description: "View shop credit and debit notes (ledger adjustments)",
  },
  "customer-ledger-adjustment.create": {
    module: "customer-ledger-adjustment",
    action: "create",
    description: "Post a credit or debit note against a shop's distribution ledger",
  },
} as const;
