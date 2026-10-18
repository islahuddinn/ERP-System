export const WAREHOUSES_PERMISSIONS = {
  "warehouses.create": {
    module: "warehouses",
    action: "create",
    description: "Create warehouses",
  },
  "warehouses.read": {
    module: "warehouses",
    action: "read",
    description: "View warehouses",
  },
  "warehouses.update": {
    module: "warehouses",
    action: "update",
    description: "Update warehouses",
  },
  "warehouses.delete": {
    module: "warehouses",
    action: "delete",
    description: "Delete warehouses",
  },
  "warehouses.manage_capacity": {
    module: "warehouses",
    action: "manage_capacity",
    description: "Manage warehouse capacity",
  },
  "warehouses.assign_manager": {
    module: "warehouses",
    action: "assign_manager",
    description: "Assign warehouse managers",
  },
  "warehouses.view": {
    module: "warehouses",
    action: "view",
    description: "View warehouses",
  },
} as const;
