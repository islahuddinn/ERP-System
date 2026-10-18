export const HOLIDAYS_PERMISSIONS = {
  "holidays.view": {
    module: "holidays",
    action: "view",
    description: "View holidays list and detail",
  },
  "holidays.manage": {
    module: "holidays",
    action: "manage",
    description: "Create, update and delete holidays",
  },
} as const;
