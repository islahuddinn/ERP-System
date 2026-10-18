export const CUSTOMER_RECOVERY_PERMISSIONS = {
  "customer-recovery.view": {
    module: "customer-recovery",
    action: "view",
    description: "View customer recoveries list and detail",
  },
  "customer-recovery.create": {
    module: "customer-recovery",
    action: "create",
    description: "Record payments collected from a shop by a sales person",
  },
} as const;
