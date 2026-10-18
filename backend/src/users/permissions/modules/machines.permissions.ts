export const MACHINES_PERMISSIONS = {
  "machines.create": { module: "machines", action: "create", description: "Create machines" },
  "machines.read": { module: "machines", action: "read", description: "View machines" },
  "machines.update": { module: "machines", action: "update", description: "Update machines" },
  "machines.delete": { module: "machines", action: "delete", description: "Delete machines" },
} as const;
