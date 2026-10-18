export const PRODUCTION_ORDERS_PERMISSIONS = {
  "production-orders.create": { module: "production-orders", action: "create", description: "Create production orders" },
  "production-orders.read": { module: "production-orders", action: "read", description: "View production orders" },
  "production-orders.update": { module: "production-orders", action: "update", description: "Update production orders" },
} as const;
