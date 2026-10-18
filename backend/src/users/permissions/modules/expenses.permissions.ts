export const EXPENSES_PERMISSIONS = {
  "expenses.create": {
    module: "expenses",
    action: "create",
    description: "Create expenses",
  },
  "expenses.read": {
    module: "expenses",
    action: "read",
    description: "View expenses",
  },
  "expenses.update": {
    module: "expenses",
    action: "update",
    description: "Update expenses",
  },
  "expenses.delete": {
    module: "expenses",
    action: "delete",
    description: "Delete expenses",
  },
  "expenses.approve": {
    module: "expenses",
    action: "approve",
    description: "Approve or reject expenses",
  },
  "expenses.reports": {
    module: "expenses",
    action: "reports",
    description: "View expense reports",
  },
} as const;
