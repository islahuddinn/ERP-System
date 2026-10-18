import { Prisma } from "@prisma/tenant-client";
import { AREA_TREE } from "../../area/utils/constants";

const DISTRIBUTOR_SELECT = {
  id: true,
  employeeCode: true,
  user: { select: { id: true, firstName: true, lastName: true, phone: true } },
} satisfies Prisma.EmployeeSelect;

const CITY_LOOKUP_SELECT = {
  id: true,
  name: true,
  zone: {
    select: {
      id: true,
      name: true,
      region: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.CitySelect;

const PARENT_BRANCH_SELECT = {
  id: true,
  name: true,
  code: true,
} satisfies Prisma.BranchSelect;

export const BRANCH_DETAIL_INCLUDE = {
  city: { select: CITY_LOOKUP_SELECT },
  distributor: { select: DISTRIBUTOR_SELECT },
  parentBranch: { select: PARENT_BRANCH_SELECT },
  _count: { select: { areas: true } },
} satisfies Prisma.BranchInclude;

export const BRANCH_LIST_INCLUDE = {
  city: { select: CITY_LOOKUP_SELECT },
  distributor: { select: DISTRIBUTOR_SELECT },
  parentBranch: { select: PARENT_BRANCH_SELECT },
  _count: { select: { areas: true } },
} satisfies Prisma.BranchInclude;

export const BRANCH_TREE = {
  orderBy: { name: "asc" } satisfies Prisma.BranchOrderByWithRelationInput,
  select: {
    id: true,
    name: true,
    status: true,
    areas: AREA_TREE,
  } satisfies Prisma.BranchSelect,
};
