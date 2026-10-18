export const SALES_ZONE_PERMISSIONS = {
  "sales-zone.view": {
    module: "sales-zone",
    action: "view",
    description: "View sales zones list and detail",
  },
  "sales-zone.manage": {
    module: "sales-zone",
    action: "manage",
    description: "Create, update and delete sales zones",
  },
} as const;
