export const POS_PERMISSIONS = {
  "pos.create_sale": {
    module: "pos",
    action: "create_sale",
    description: "Create sales",
  },
  "pos.process_payment": {
    module: "pos",
    action: "process_payment",
    description: "Process payments",
  },
  "pos.refund": {
    module: "pos",
    action: "refund",
    description: "Process refunds",
  },
  "pos.cancel_sale": {
    module: "pos",
    action: "cancel_sale",
    description: "Cancel sales",
  },
  "pos.update_sale": {
    module: "pos",
    action: "update_sale",
    description: "Edit existing sales",
  },
  "pos.credit_sale": {
    module: "pos",
    action: "credit_sale",
    description: "Create credit sales",
  },
  "pos.view_all_sales": {
    module: "pos",
    action: "view_all_sales",
    description: "View all sales",
  },
  "pos.create_return": {
    module: "pos",
    action: "create_return",
    description: "Create sale returns",
  },
  "pos.view_returns": {
    module: "pos",
    action: "view_returns",
    description: "View sale returns",
  },
  "pos.process_return": {
    module: "pos",
    action: "process_return",
    description: "Approve or process sale returns",
  },
} as const;
