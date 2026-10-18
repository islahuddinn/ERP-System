export const STOCK_PERMISSIONS = {
  "stock.read": {
    module: "stock",
    action: "read",
    description: "View stock",
  },
  "stock.create": {
    module: "stock",
    action: "create",
    description: "Create batches and stock entries",
  },
  "stock.update": {
    module: "stock",
    action: "update",
    description: "Update stock and batches",
  },
  "stock.adjust": {
    module: "stock",
    action: "adjust",
    description: "Adjust stock quantities",
  },
  "stock.transfer": {
    module: "stock",
    action: "transfer",
    description: "Transfer stock between locations",
  },
  "stock.stocktake": {
    module: "stock",
    action: "stocktake",
    description: "Perform stocktake",
  },
} as const;
