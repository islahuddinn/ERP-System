import { Prisma } from "@prisma/tenant-client";
import { BRANCH_TREE } from "../../branch/utils/constants";

export const CITY_DETAIL_INCLUDE = {
  zone: { include: { region: { select: { id: true, name: true } } } },
  _count: { select: { branches: true } },
} satisfies Prisma.CityInclude;

export const CITY_LIST_INCLUDE = {
  zone: { include: { region: { select: { id: true, name: true } } } },
  _count: { select: { branches: true } },
} satisfies Prisma.CityInclude;

export const CITY_TREE = {
  orderBy: { name: "asc" } satisfies Prisma.CityOrderByWithRelationInput,
  select: {
    id: true,
    name: true,
    status: true,
    branches: BRANCH_TREE,
  } satisfies Prisma.CitySelect,
};
