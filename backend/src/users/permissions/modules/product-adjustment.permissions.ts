export const PRODUCT_ADJUSTMENT_PERMISSIONS = {
  "product-adjustment.view": {
    module: "product-adjustment",
    action: "view",
    description: "View shop product adjustment records",
  },
  "product-adjustment.create": {
    module: "product-adjustment",
    action: "create",
    description: "Create shop product adjustment records",
  },
} as const;
