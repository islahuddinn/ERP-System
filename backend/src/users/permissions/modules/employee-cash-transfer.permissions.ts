export const EMPLOYEE_CASH_TRANSFER_PERMISSIONS = {
  "employee-cash-transfer.view": {
    module: "employee-cash-transfer",
    action: "view",
    description: "View employee cash transfers list and detail",
  },
  "employee-cash-transfer.create": {
    module: "employee-cash-transfer",
    action: "create",
    description: "Record cash an employee is handing over to another employee",
  },
  "employee-cash-transfer.update": {
    module: "employee-cash-transfer",
    action: "update",
    description: "Update a transfer you sent, while it is still pending",
  },
  "employee-cash-transfer.respond": {
    module: "employee-cash-transfer",
    action: "respond",
    description: "Confirm or reject a pending transfer sent to you",
  },
} as const;
