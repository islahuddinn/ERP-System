export const SHIFTS_PERMISSIONS = {
  "shifts.view": {
    module: "shifts",
    action: "view",
    description: "View shifts list and detail",
  },
  "shifts.manage": {
    module: "shifts",
    action: "manage",
    description: "Create, update and delete shifts",
  },
} as const;
