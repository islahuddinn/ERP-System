export const CUSTOMERS_PERMISSIONS = {
  "customers.create": {
    module: "customers",
    action: "create",
    description: "Create customers",
  },
  "customers.read": {
    module: "customers",
    action: "read",
    description: "View customers",
  },
  "customers.update": {
    module: "customers",
    action: "update",
    description: "Update customers",
  },
  "customers.delete": {
    module: "customers",
    action: "delete",
    description: "Delete customers",
  },
} as const;
