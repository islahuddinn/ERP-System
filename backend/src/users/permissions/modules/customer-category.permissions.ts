export const CUSTOMER_CATEGORY_PERMISSIONS = {
  "customer-category.view": {
    module: "customer-category",
    action: "view",
    description: "View customer categories list and detail",
  },
  "customer-category.manage": {
    module: "customer-category",
    action: "manage",
    description: "Create, update and delete customer categories",
  },
} as const;
