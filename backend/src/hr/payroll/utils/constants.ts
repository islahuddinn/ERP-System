import { Prisma } from "@prisma/tenant-client";

export const PAYROLL_INCLUDE = {
  employee: {
    select: {
      id: true,
      employeeCode: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  },
} satisfies Prisma.PayrollInclude;
