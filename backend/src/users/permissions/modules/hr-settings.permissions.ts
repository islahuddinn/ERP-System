export const HR_SETTINGS_PERMISSIONS = {
  "hr-settings.view": {
    module: "hr-settings",
    action: "view",
    description: "View HR settings",
  },
  "hr-settings.manage": {
    module: "hr-settings",
    action: "manage",
    description: "Update HR settings",
  },
} as const;
