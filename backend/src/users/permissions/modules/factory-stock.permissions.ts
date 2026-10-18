export const FACTORY_STOCK_PERMISSIONS = {
  "factory-stock.view": {
    module: "factory-stock",
    action: "view",
    description: "View factory stock balances",
  },
  "factory-stock.manage": {
    module: "factory-stock",
    action: "manage",
    description: "Add stock to the Factory and apply corrections (wastage, stock count fixes)",
  },
} as const;
