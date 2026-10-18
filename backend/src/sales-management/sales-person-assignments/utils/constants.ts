import { Prisma } from "@prisma/tenant-client";

const EMPLOYEE_LOOKUP_SELECT = {
  id: true,
  employeeCode: true,
  user: { select: { id: true, firstName: true, lastName: true, phone: true } },
} satisfies Prisma.EmployeeSelect;

const BRANCH_LOOKUP_SELECT = {
  id: true,
  name: true,
  code: true,
} satisfies Prisma.BranchSelect;

export const SALES_PERSON_ASSIGNMENT_INCLUDE = {
  employee: { select: EMPLOYEE_LOOKUP_SELECT },
  branch: { select: BRANCH_LOOKUP_SELECT },
} satisfies Prisma.SalesPersonAssignmentInclude;
