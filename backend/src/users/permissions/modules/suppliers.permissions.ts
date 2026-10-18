export const SUPPLIERS_PERMISSIONS = {
  "suppliers.create": {
    module: "suppliers",
    action: "create",
    description: "Create suppliers",
  },
  "suppliers.read": {
    module: "suppliers",
    action: "read",
    description: "View suppliers",
  },
  "suppliers.update": {
    module: "suppliers",
    action: "update",
    description: "Update suppliers",
  },
  "suppliers.delete": {
    module: "suppliers",
    action: "delete",
    description: "Delete suppliers",
  },
} as const;
