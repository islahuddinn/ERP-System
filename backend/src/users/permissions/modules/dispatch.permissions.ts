export const DISPATCH_PERMISSIONS = {
  "dispatch.create": {
    module: "dispatch",
    action: "create",
    description: "Create dispatch orders",
  },
  "dispatch.read": {
    module: "dispatch",
    action: "read",
    description: "View dispatch orders",
  },
  "dispatch.update": {
    module: "dispatch",
    action: "update",
    description: "Update dispatch orders",
  },
  "dispatch.delete": {
    module: "dispatch",
    action: "delete",
    description: "Delete dispatch orders",
  },
  "dispatch.process": {
    module: "dispatch",
    action: "process",
    description: "Process and complete dispatches",
  },
} as const;
