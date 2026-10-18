import { Prisma } from "@prisma/tenant-client";
import { ZONE_TREE } from "../../zone/utils/constants";

export const REGION_DETAIL_INCLUDE = {
  _count: { select: { zones: true } },
} satisfies Prisma.RegionInclude;

export const REGION_LIST_INCLUDE = {
  _count: { select: { zones: true } },
} satisfies Prisma.RegionInclude;

export const REGION_TREE_SELECT = {
  id: true,
  name: true,
  status: true,
  zones: ZONE_TREE,
} satisfies Prisma.RegionSelect;
