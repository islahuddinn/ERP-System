export const PRODUCT_GROUP_PERMISSIONS = {
  "product-group.view": {
    module: "product-group",
    action: "view",
    description: "View product groups list and detail",
  },
  "product-group.manage": {
    module: "product-group",
    action: "manage",
    description: "Create, update and delete product groups",
  },
} as const;
