import { Prisma } from "@prisma/tenant-client";

const BRANCH_LOOKUP_SELECT = {
  id: true,
  name: true,
  city: {
    select: {
      id: true,
      name: true,
      zone: {
        select: {
          id: true,
          name: true,
          region: { select: { id: true, name: true } },
        },
      },
    },
  },
} satisfies Prisma.BranchSelect;

export const AREA_DETAIL_INCLUDE = {
  branch: { select: BRANCH_LOOKUP_SELECT },
} satisfies Prisma.AreaInclude;

export const AREA_LIST_INCLUDE = {
  branch: { select: BRANCH_LOOKUP_SELECT },
} satisfies Prisma.AreaInclude;

const CUSTOMER_TREE_SELECT = {
  orderBy: { shopName: "asc" } satisfies Prisma.CustomerOrderByWithRelationInput,
  select: {
    id: true,
    shopName: true,
    code: true,
    phone: true,
    status: true,
    address: true,
  } satisfies Prisma.CustomerSelect,
};

export const AREA_TREE = {
  orderBy: { name: "asc" } satisfies Prisma.AreaOrderByWithRelationInput,
  select: {
    id: true,
    name: true,
    status: true,
    customers: CUSTOMER_TREE_SELECT,
  } satisfies Prisma.AreaSelect,
};
