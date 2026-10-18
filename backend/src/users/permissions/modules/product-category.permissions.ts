export const PRODUCT_CATEGORY_PERMISSIONS = {
  "product-category.view": {
    module: "product-category",
    action: "view",
    description: "View product categories list and detail",
  },
  "product-category.manage": {
    module: "product-category",
    action: "manage",
    description: "Create, update and delete product categories",
  },
} as const;
