export const BROKER_PERMISSIONS = {
  "broker.view": {
    module: "broker",
    action: "view",
    description: "View brokers list and detail",
  },
  "broker.manage": {
    module: "broker",
    action: "manage",
    description: "Create, update and delete brokers",
  },
} as const;
