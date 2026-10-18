export const HR_DESIGNATIONS_PERMISSIONS = {
  "hr-designations.view": {
    module: "hr-designations",
    action: "view",
    description: "View designations list, detail, and hierarchy tree",
  },
  "hr-designations.manage": {
    module: "hr-designations",
    action: "manage",
    description: "Create, update and delete designations",
  },
} as const;
