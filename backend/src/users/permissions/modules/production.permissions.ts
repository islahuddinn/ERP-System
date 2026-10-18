export const PRODUCTION_PERMISSIONS = {
  "production.create": {
    module: "production",
    action: "create",
    description: "Create production orders",
  },
  "production.read": {
    module: "production",
    action: "read",
    description: "View production orders",
  },
  "production.update": {
    module: "production",
    action: "update",
    description: "Update production orders",
  },
  "production.delete": {
    module: "production",
    action: "delete",
    description: "Delete production orders",
  },
  "production.approve": {
    module: "production",
    action: "approve",
    description: "Approve production orders",
  },
  "production.complete": {
    module: "production",
    action: "complete",
    description: "Mark production orders as complete",
  },
  "production.manage_bom": {
    module: "production",
    action: "manage_bom",
    description: "Create and manage Bills of Materials",
  },
} as const;
