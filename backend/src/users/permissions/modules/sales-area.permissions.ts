export const SALES_AREA_PERMISSIONS = {
  "sales-area.view": {
    module: "sales-area",
    action: "view",
    description: "View sales areas list and detail",
  },
  "sales-area.manage": {
    module: "sales-area",
    action: "manage",
    description: "Create, update and delete sales areas",
  },
} as const;
