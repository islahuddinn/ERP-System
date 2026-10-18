export const PRODUCT_BONUS_SCHEME_PERMISSIONS = {
  "product-bonus-scheme.view": {
    module: "product-bonus-scheme",
    action: "view",
    description: "View product bonus schemes list and detail",
  },
  "product-bonus-scheme.manage": {
    module: "product-bonus-scheme",
    action: "manage",
    description: "Create, update and delete product bonus schemes",
  },
} as const;
