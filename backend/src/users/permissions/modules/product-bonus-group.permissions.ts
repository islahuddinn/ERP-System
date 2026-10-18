export const PRODUCT_BONUS_GROUP_PERMISSIONS = {
  "product-bonus-group.view": {
    module: "product-bonus-group",
    action: "view",
    description: "View product bonus groups list and detail",
  },
  "product-bonus-group.manage": {
    module: "product-bonus-group",
    action: "manage",
    description: "Create, update and delete product bonus groups",
  },
} as const;
