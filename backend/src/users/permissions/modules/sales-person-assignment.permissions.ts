export const SALES_PERSON_ASSIGNMENT_PERMISSIONS = {
  "sales-person-assignment.view": {
    module: "sales-person-assignment",
    action: "view",
    description: "View Sales Person assignments",
  },
  "sales-person-assignment.manage": {
    module: "sales-person-assignment",
    action: "manage",
    description: "Assign or unassign Sales People to my branch",
  },
} as const;
