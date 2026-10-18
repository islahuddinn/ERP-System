import { Prisma, ProductGroupStatus } from "@prisma/tenant-client";
import { BRANCH_DETAIL_INCLUDE, BRANCH_LIST_INCLUDE, BRANCH_TREE } from "./constants";

export type ProductGroupSummary = { id: string; name: string; status: ProductGroupStatus };

// `type` (PRIMARY/SECONDARY) comes through automatically as a Branch scalar
// column — no manual addition needed here.
export type BranchDetail = Prisma.BranchGetPayload<{ include: typeof BRANCH_DETAIL_INCLUDE }> & {
  productGroups: ProductGroupSummary[];
};
export type BranchListItem = Prisma.BranchGetPayload<{ include: typeof BRANCH_LIST_INCLUDE }> & {
  productGroups: ProductGroupSummary[];
};
export type BranchTree = Prisma.BranchGetPayload<{ select: typeof BRANCH_TREE.select }>;
