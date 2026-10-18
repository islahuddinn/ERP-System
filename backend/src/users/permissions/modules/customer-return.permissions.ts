export const CUSTOMER_RETURN_PERMISSIONS = {
  "customer-return.view": {
    module: "customer-return",
    action: "view",
    description: "View customer returns list and detail",
  },
  "customer-return.create": {
    module: "customer-return",
    action: "create",
    description: "Record goods returned by a shop to a sales person",
  },
  "customer-return.approve": {
    module: "customer-return",
    action: "approve",
    description: "Approve or reject customer returns — approving restores stock and posts the ledger credit",
  },
} as const;
