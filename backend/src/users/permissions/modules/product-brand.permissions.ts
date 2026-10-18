export const PRODUCT_BRAND_PERMISSIONS = {
  "product-brand.view": {
    module: "product-brand",
    action: "view",
    description: "View product brands list and detail",
  },
  "product-brand.manage": {
    module: "product-brand",
    action: "manage",
    description: "Create, update and delete product brands",
  },
} as const;
