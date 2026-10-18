export const BRANCH_STOCK_RETURN_PERMISSIONS = {
  "branch-stock-return.view": {
    module: "branch-stock-return",
    action: "view",
    description: "View branch stock returns",
  },
  "branch-stock-return.create": {
    module: "branch-stock-return",
    action: "create",
    description: "Return stock from my branch back to where it came from",
  },
  "branch-stock-return.approve": {
    module: "branch-stock-return",
    action: "approve",
    description: "Approve or reject stock returns made to my branch",
  },
  "branch-stock-return.approve-factory": {
    module: "branch-stock-return",
    action: "approve-factory",
    description: "Approve or reject stock returns made to the Factory",
  },
} as const;
