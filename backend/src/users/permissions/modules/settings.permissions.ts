export const SETTINGS_PERMISSIONS = {
  "settings.view": {
    module: "settings",
    action: "view",
    description: "View settings",
  },
  "settings.update": {
    module: "settings",
    action: "update",
    description: "Update general settings",
  },
  "settings.update_branding": {
    module: "settings",
    action: "update_branding",
    description: "Update branding",
  },
} as const;
