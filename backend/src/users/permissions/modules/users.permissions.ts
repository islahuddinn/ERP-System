export const USERS_PERMISSIONS = {
  "users.create": {
    module: "users",
    action: "create",
    description: "Create users",
  },
  "users.read": {
    module: "users",
    action: "read",
    description: "View users",
  },
  "users.update": {
    module: "users",
    action: "update",
    description: "Update users",
  },
  "users.delete": {
    module: "users",
    action: "delete",
    description: "Delete users",
  },
  "users.manage_roles": {
    module: "users",
    action: "manage_roles",
    description: "Assign and change user roles",
  },
} as const;
