export const BRANCH_STOCK_REQUEST_PERMISSIONS = {
  "branch-stock-request.view": {
    module: "branch-stock-request",
    action: "view",
    description: "View branch stock requests",
  },
  "branch-stock-request.create": {
    module: "branch-stock-request",
    action: "create",
    description: "Request stock from my branch's parent or the Factory",
  },
  "branch-stock-request.approve": {
    module: "branch-stock-request",
    action: "approve",
    description: "Approve or reject stock requests made to my branch",
  },
  "branch-stock-request.approve-factory": {
    module: "branch-stock-request",
    action: "approve-factory",
    description: "Approve or reject stock requests made to the Factory",
  },
} as const;
