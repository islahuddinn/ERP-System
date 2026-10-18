export const CASH_PERMISSIONS = {
  "cash.view": {
    module: "cash",
    action: "view",
    description: "View cash operations",
  },
  "cash.count": {
    module: "cash",
    action: "count",
    description: "Count cash",
  },
  "cash.approve": {
    module: "cash",
    action: "approve",
    description: "Approve cash counts",
  },
} as const;
