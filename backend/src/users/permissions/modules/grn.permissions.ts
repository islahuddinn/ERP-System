export const GRN_PERMISSIONS = {
  "grn.create": {
    module: "grn",
    action: "create",
    description: "Create goods receipt notes",
  },
  "grn.read": {
    module: "grn",
    action: "read",
    description: "View goods receipt notes",
  },
  "grn.update": {
    module: "grn",
    action: "update",
    description: "Update goods receipt notes",
  },
  "grn.delete": {
    module: "grn",
    action: "delete",
    description: "Delete goods receipt notes",
  },
  "grn.approve": {
    module: "grn",
    action: "approve",
    description: "Approve goods receipt notes",
  },
} as const;
