export const WASTE_MANAGEMENT_PERMISSIONS = {
  "waste-management.create": {
    module: "waste-management",
    action: "create",
    description: "Record waste",
  },
  "waste-management.read": {
    module: "waste-management",
    action: "read",
    description: "View waste records",
  },
  "waste-management.update": {
    module: "waste-management",
    action: "update",
    description: "Update waste records and resolve disposition",
  },
  "waste-management.delete": {
    module: "waste-management",
    action: "delete",
    description: "Delete waste records",
  },
} as const;
