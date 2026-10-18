export const BRANCH_PRODUCT_PRICE_PERMISSIONS = {
  "branch-product-price.view": {
    module: "branch-product-price",
    action: "view",
    description: "View branch and Factory product price lists",
  },
  "branch-product-price.manage": {
    module: "branch-product-price",
    action: "manage",
    description: "Set my own branch's product prices",
  },
  "branch-product-price.manage-factory": {
    module: "branch-product-price",
    action: "manage-factory",
    description: "Set the Factory's product prices",
  },
} as const;
