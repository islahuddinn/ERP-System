import { Prisma } from "@prisma/tenant-client";

export const DESIGNATION_DETAIL_INCLUDE = {
  parent: { select: { id: true, title: true } },
  childDesignations: { select: { id: true, title: true } },
} satisfies Prisma.DesignationInclude;

// List rows need the parent title + employee (contract) count for their columns.
export const DESIGNATION_LIST_INCLUDE = {
  parent: { select: { id: true, title: true } },
  _count: { select: { contracts: true } },
} satisfies Prisma.DesignationInclude;

// Flat rows used to assemble the hierarchy tree — each node shows its employee count.
export const DESIGNATION_TREE_INCLUDE = {
  _count: { select: { contracts: true } },
} satisfies Prisma.DesignationInclude;
