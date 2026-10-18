export const CUSTOMER_ORDER_PERMISSIONS = {
  "customer-order.view": {
    module: "customer-order",
    action: "view",
    description: "View customer orders list and detail",
  },
  "customer-order.create": {
    module: "customer-order",
    action: "create",
    description: "Book orders from a shop visit",
  },
} as const;
