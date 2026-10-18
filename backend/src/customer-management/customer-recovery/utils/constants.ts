import { Prisma } from "@prisma/tenant-client";

const CUSTOMER_LOOKUP_SELECT = {
  id: true,
  code: true,
  shopName: true,
} satisfies Prisma.CustomerSelect;

const SALES_PERSON_SELECT = {
  id: true,
  employeeCode: true,
  user: { select: { id: true, firstName: true, lastName: true, phone: true } },
} satisfies Prisma.EmployeeSelect;

export const CUSTOMER_RECOVERY_DETAIL_INCLUDE = {
  customer: { select: CUSTOMER_LOOKUP_SELECT },
  salesPerson: { select: SALES_PERSON_SELECT },
} satisfies Prisma.CustomerRecoveryInclude;

export const CUSTOMER_RECOVERY_LIST_INCLUDE = CUSTOMER_RECOVERY_DETAIL_INCLUDE;
