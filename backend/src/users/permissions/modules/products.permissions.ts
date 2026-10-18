export const PRODUCTS_PERMISSIONS = {
  "products.create": {
    module: "products",
    action: "create",
    description: "Create products",
  },
  "products.read": {
    module: "products",
    action: "read",
    description: "View products",
  },
  "products.update": {
    module: "products",
    action: "update",
    description: "Update products",
  },
  "products.delete": {
    module: "products",
    action: "delete",
    description: "Delete products",
  },
  "products.bulk_import": {
    module: "products",
    action: "bulk_import",
    description: "Bulk import products",
  },
} as const;
