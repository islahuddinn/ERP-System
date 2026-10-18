export const SALES_BRANCH_PERMISSIONS = {
  "sales-branch.view": {
    module: "sales-branch",
    action: "view",
    description: "View branches list and detail",
  },
  "sales-branch.manage": {
    module: "sales-branch",
    action: "manage",
    description: "Create, update and delete branches",
  },
} as const;
