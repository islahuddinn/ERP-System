import { Prisma } from "@prisma/tenant-client";

export const SALARY_REVISION_INCLUDE = {
  createdBy: { select: { id: true, firstName: true, lastName: true } },
} satisfies Prisma.SalaryRevisionInclude;

export const CONTRACT_LIST_INCLUDE = {
  employee: {
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
    },
  },
  position:   { select: { id: true, title: true } },
  department: { select: { id: true, name: true } },
  salaryRevisions: {
    where:   { status: "CURRENT" as const },
    take:    1,
  },
} satisfies Prisma.EmployeeContractInclude;

export const CONTRACT_DETAIL_INCLUDE = {
  employee: {
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      },
    },
  },
  position:        { select: { id: true, title: true } },
  department:      { select: { id: true, name: true } },
  salaryRevisions: {
    include: SALARY_REVISION_INCLUDE,
    orderBy: { createdAt: "desc" as const },
  },
  allowances: {
    orderBy: { createdAt: "asc" as const },
  },
} satisfies Prisma.EmployeeContractInclude;
