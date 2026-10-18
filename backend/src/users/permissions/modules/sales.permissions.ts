export const SALES_PERMISSIONS = {
  "sales.create": {
    module: "sales",
    action: "create",
    description: "Create sales orders",
  },
  "sales.read": {
    module: "sales",
    action: "read",
    description: "View sales orders",
  },
  "sales.update": {
    module: "sales",
    action: "update",
    description: "Update sales orders",
  },
  "sales.delete": {
    module: "sales",
    action: "delete",
    description: "Delete sales orders",
  },
  "sales.approve": {
    module: "sales",
    action: "approve",
    description: "Approve sales orders",
  },
  "sales.cancel": {
    module: "sales",
    action: "cancel",
    description: "Cancel sales orders",
  },
} as const;
