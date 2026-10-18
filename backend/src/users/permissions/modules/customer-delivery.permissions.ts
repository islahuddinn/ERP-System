export const CUSTOMER_DELIVERY_PERMISSIONS = {
  "customer-delivery.view": {
    module: "customer-delivery",
    action: "view",
    description: "View customer deliveries list and detail",
  },
  "customer-delivery.create": {
    module: "customer-delivery",
    action: "create",
    description: "Record deliveries from a sales person to a shop",
  },
  "customer-delivery.deliver": {
    module: "customer-delivery",
    action: "deliver",
    description: "Mark a pending delivery as delivered, confirming it reached the shop",
  },
} as const;
