import { Prisma } from "@prisma/tenant-client";
import { REGION_DETAIL_INCLUDE, REGION_LIST_INCLUDE, REGION_TREE_SELECT } from "./constants";

export type RegionDetail = Prisma.RegionGetPayload<{ include: typeof REGION_DETAIL_INCLUDE }>;
export type RegionListItem = Prisma.RegionGetPayload<{ include: typeof REGION_LIST_INCLUDE }>;
export type RegionTree = Prisma.RegionGetPayload<{ select: typeof REGION_TREE_SELECT }>;
