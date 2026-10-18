export const HR_PERMISSIONS = {
  "hr.view": {
    module: "hr",
    action: "view",
    description: "View HR master data and employees",
  },
  "hr.manage_employees": {
    module: "hr",
    action: "manage_employees",
    description: "Create and manage employees, departments and positions",
  },
  "hr.manage_attendance": {
    module: "hr",
    action: "manage_attendance",
    description: "Create and manage shifts, rosters and attendance logs",
  },
  "hr.approve_overtime": {
    module: "hr",
    action: "approve_overtime",
    description: "Approve or reject employee overtime",
  },
  "hr.manage_payroll": {
    module: "hr",
    action: "manage_payroll",
    description: "Configure salary structures and manage payroll runs",
  },
  "hr.approve_payroll": {
    module: "hr",
    action: "approve_payroll",
    description: "Approve calculated payroll runs before posting",
  },
  "hr.post_payroll_finance": {
    module: "hr",
    action: "post_payroll_finance",
    description: "Post approved payroll runs to finance",
  },
  "hr.manage_contracts": {
    module: "hr",
    action: "manage_contracts",
    description: "Create, activate, terminate contracts and manage salary revisions",
  },
  "hr.manage": {
    module: "hr",
    action: "manage",
    description: "Full HR management access",
  },
  "hr.view_recruitment": {
    module: "hr",
    action: "view_recruitment",
    description: "View recruitment pipelines and job postings",
  },
  "hr.manage_recruitment": {
    module: "hr",
    action: "manage_recruitment",
    description: "Create and manage recruitment pipelines and job postings",
  },
} as const;
