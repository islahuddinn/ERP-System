export const BOM_PERMISSIONS = {
  "bom.create": { module: "bom", action: "create", description: "Create bills of materials" },
  "bom.read": { module: "bom", action: "read", description: "View bills of materials" },
  "bom.update": { module: "bom", action: "update", description: "Update bills of materials" },
  "bom.delete": { module: "bom", action: "delete", description: "Delete bills of materials" },
} as const;
