export const PLANTS_PERMISSIONS = {
  "plants.create": { module: "plants", action: "create", description: "Create plants" },
  "plants.read": { module: "plants", action: "read", description: "View plants" },
  "plants.update": { module: "plants", action: "update", description: "Update plants" },
  "plants.delete": { module: "plants", action: "delete", description: "Delete plants" },
} as const;
