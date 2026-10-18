export const ZONES_PERMISSIONS = {
  "zones.create": {
    module: "zones",
    action: "create",
    description: "Create zones",
  },
  "zones.read": {
    module: "zones",
    action: "read",
    description: "View zones",
  },
  "zones.update": {
    module: "zones",
    action: "update",
    description: "Update zones",
  },
  "zones.delete": {
    module: "zones",
    action: "delete",
    description: "Delete zones",
  },
  "zones.manage_capacity": {
    module: "zones",
    action: "manage_capacity",
    description: "Manage zone capacity",
  },
  "zones.view": {
    module: "zones",
    action: "view",
    description: "View zones",
  },
} as const;
