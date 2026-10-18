export const LEAVE_REQUESTS_PERMISSIONS = {
  "leave-requests.view": {
    module: "leave-requests",
    action: "view",
    description: "View leave requests",
  },
  "leave-requests.manage": {
    module: "leave-requests",
    action: "manage",
    description: "Create and cancel leave requests",
  },
  "leave-requests.approve": {
    module: "leave-requests",
    action: "approve",
    description: "Approve or reject leave requests as an assigned approver",
  },
} as const;
