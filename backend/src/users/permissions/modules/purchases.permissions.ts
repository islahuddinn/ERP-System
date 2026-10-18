export const PURCHASES_PERMISSIONS = {
  "purchases.create": {
    module: "purchases",
    action: "create",
    description: "Create purchase orders",
  },
  "purchases.read": {
    module: "purchases",
    action: "read",
    description: "View purchase orders",
  },
  "purchases.update": {
    module: "purchases",
    action: "update",
    description: "Update purchase orders",
  },
  "purchases.delete": {
    module: "purchases",
    action: "delete",
    description: "Delete purchase orders",
  },
  "purchases.approve": {
    module: "purchases",
    action: "approve",
    description: "Approve purchase orders",
  },
  "purchases.receive": {
    module: "purchases",
    action: "receive",
    description: "Receive stock from purchase orders",
  },
} as const;
