import { Prisma } from "@prisma/tenant-client";

export const DEPARTMENT_DETAIL_INCLUDE = {
  parent: { select: { id: true, name: true } },
  childDepartments: { select: { id: true, name: true } },
} satisfies Prisma.DepartmentInclude;

// List rows need the parent name + employee (contract) count for their columns.
export const DEPARTMENT_LIST_INCLUDE = {
  parent: { select: { id: true, name: true } },
  _count: { select: { contracts: true } },
} satisfies Prisma.DepartmentInclude;

// Flat rows used to assemble the hierarchy tree — each node shows its employee count.
export const DEPARTMENT_TREE_INCLUDE = {
  _count: { select: { contracts: true } },
} satisfies Prisma.DepartmentInclude;
