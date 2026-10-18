export const RAW_MATERIALS_PERMISSIONS = {
  "raw-materials.create": {
    module: "raw-materials",
    action: "create",
    description: "Create raw materials",
  },
  "raw-materials.read": {
    module: "raw-materials",
    action: "read",
    description: "View raw materials",
  },
  "raw-materials.update": {
    module: "raw-materials",
    action: "update",
    description: "Update raw materials",
  },
  "raw-materials.delete": {
    module: "raw-materials",
    action: "delete",
    description: "Delete raw materials",
  },
  "raw-materials.manage_stock": {
    module: "raw-materials",
    action: "manage_stock",
    description: "Manage raw material stock and batches",
  },
} as const;
