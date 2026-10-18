export const LOCATIONS_PERMISSIONS = {
  "locations.create": {
    module: "locations",
    action: "create",
    description: "Create locations",
  },
  "locations.read": {
    module: "locations",
    action: "read",
    description: "View locations",
  },
  "locations.update": {
    module: "locations",
    action: "update",
    description: "Update locations",
  },
  "locations.delete": {
    module: "locations",
    action: "delete",
    description: "Delete locations",
  },
} as const;
