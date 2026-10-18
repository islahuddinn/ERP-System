import { Prisma } from "@prisma/tenant-client";

export const USER_SELECT = {
  id: true,
  firstName: true,
  lastName: true,
  email: true,
} satisfies Prisma.UserSelect;

export const LOAN_REQUEST_INCLUDE = {
  employee: {
    select: {
      id: true,
      employeeCode: true,
      user: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  approvals: { orderBy: { createdAt: "asc" as const } },
  installments: { orderBy: { installmentNumber: "asc" as const } },
} satisfies Prisma.LoanRequestInclude;
