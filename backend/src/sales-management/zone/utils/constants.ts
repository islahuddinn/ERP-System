import { Prisma } from "@prisma/tenant-client";
import { CITY_TREE } from "../../city/utils/constants";

export const ZONE_DETAIL_INCLUDE = {
  region: { select: { id: true, name: true } },
  _count: { select: { cities: true } },
} satisfies Prisma.ZoneInclude;

export const ZONE_LIST_INCLUDE = {
  region: { select: { id: true, name: true } },
  _count: { select: { cities: true } },
} satisfies Prisma.ZoneInclude;

export const ZONE_TREE = {
  orderBy: { name: "asc" } satisfies Prisma.ZoneOrderByWithRelationInput,
  select: {
    id: true,
    name: true,
    status: true,
    cities: CITY_TREE,
  } satisfies Prisma.ZoneSelect,
};
