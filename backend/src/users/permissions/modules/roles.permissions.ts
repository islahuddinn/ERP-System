export const ROLES_PERMISSIONS = {
  "roles.create": {
    module: "roles",
    action: "create",
    description: "Create roles",
  },
  "roles.read": {
    module: "roles",
    action: "read",
    description: "View roles and their permissions",
  },
  "roles.update": {
    module: "roles",
    action: "update",
    description: "Update roles and assign permissions",
  },
  "roles.delete": {
    module: "roles",
    action: "delete",
    description: "Delete roles",
  },
} as const;
