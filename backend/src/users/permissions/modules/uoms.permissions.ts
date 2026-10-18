export const UOMS_PERMISSIONS = {
  "uoms.create": { module: "uoms", action: "create", description: "Create units of measure" },
  "uoms.read": { module: "uoms", action: "read", description: "View units of measure" },
  "uoms.delete": { module: "uoms", action: "delete", description: "Delete units of measure" },
} as const;
