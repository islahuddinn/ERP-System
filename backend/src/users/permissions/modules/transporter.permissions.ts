export const TRANSPORTER_PERMISSIONS = {
  "transporter.view": {
    module: "transporter",
    action: "view",
    description: "View transporters list and detail",
  },
  "transporter.manage": {
    module: "transporter",
    action: "manage",
    description: "Create, update and delete transporters",
  },
} as const;
