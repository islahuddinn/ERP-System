import { Prisma } from "@prisma/tenant-client";
import { ZONE_DETAIL_INCLUDE, ZONE_LIST_INCLUDE, ZONE_TREE } from "./constants";

export type ZoneDetail = Prisma.ZoneGetPayload<{ include: typeof ZONE_DETAIL_INCLUDE }>;
export type ZoneListItem = Prisma.ZoneGetPayload<{ include: typeof ZONE_LIST_INCLUDE }>;
export type ZoneTree = Prisma.ZoneGetPayload<{ select: typeof ZONE_TREE.select }>;
