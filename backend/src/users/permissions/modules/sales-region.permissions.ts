export const SALES_REGION_PERMISSIONS = {
  "sales-region.view": {
    module: "sales-region",
    action: "view",
    description: "View sales regions list and detail",
  },
  "sales-region.manage": {
    module: "sales-region",
    action: "manage",
    description: "Create, update and delete sales regions",
  },
} as const;
