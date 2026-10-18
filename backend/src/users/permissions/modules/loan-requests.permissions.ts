export const LOAN_REQUESTS_PERMISSIONS = {
  "loan-requests.view": {
    module: "loan-requests",
    action: "view",
    description: "View loan requests",
  },
  "loan-requests.create": {
    module: "loan-requests",
    action: "create",
    description: "Create loan requests",
  },
  "loan-requests.update": {
    module: "loan-requests",
    action: "update",
    description: "Update loan requests you created",
  },
  "loan-requests.delete": {
    module: "loan-requests",
    action: "delete",
    description: "Delete loan requests you created",
  },
  "loan-requests.manage": {
    module: "loan-requests",
    action: "manage",
    description:
      "Bundles create, update, delete and installment-payment actions for loan requests into one permission",
  },
  "loan-requests.approve": {
    module: "loan-requests",
    action: "approve",
    description: "Approve or reject loan requests as an assigned approver",
  },
} as const;
