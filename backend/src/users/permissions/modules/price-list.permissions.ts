export const PRICE_LIST_PERMISSIONS = {
  "price-list.view": {
    module: "price-list",
    action: "view",
    description: "View the 4 company-wide price lists",
  },
  "price-list.manage": {
    module: "price-list",
    action: "manage",
    description: "Set prices on the 4 company-wide price lists — Finance/Admin only",
  },
} as const;
