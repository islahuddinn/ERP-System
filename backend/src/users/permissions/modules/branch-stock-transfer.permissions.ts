export const BRANCH_STOCK_TRANSFER_PERMISSIONS = {
  "branch-stock-transfer.view": {
    module: "branch-stock-transfer",
    action: "view",
    description: "View branch stock transfers",
  },
  "branch-stock-transfer.confirm-receipt": {
    module: "branch-stock-transfer",
    action: "confirm-receipt",
    description: "Confirm receipt of a dispatched stock transfer at my branch",
  },
  "branch-stock-transfer.cancel": {
    module: "branch-stock-transfer",
    action: "cancel",
    description: "Cancel a dispatched stock transfer, reversing the stock it took out of the source",
  },
} as const;
