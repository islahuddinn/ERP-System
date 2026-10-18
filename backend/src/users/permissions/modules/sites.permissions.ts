export const SITES_PERMISSIONS = {
  "sites.create": { module: "sites", action: "create", description: "Create sites" },
  "sites.read": { module: "sites", action: "read", description: "View sites" },
  "sites.update": { module: "sites", action: "update", description: "Update sites" },
  "sites.delete": { module: "sites", action: "delete", description: "Delete sites" },
} as const;
