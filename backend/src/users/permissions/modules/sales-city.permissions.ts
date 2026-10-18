export const SALES_CITY_PERMISSIONS = {
  "sales-city.view": {
    module: "sales-city",
    action: "view",
    description: "View sales cities list and detail",
  },
  "sales-city.manage": {
    module: "sales-city",
    action: "manage",
    description: "Create, update and delete sales cities",
  },
} as const;
