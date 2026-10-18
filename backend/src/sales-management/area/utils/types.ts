import { Prisma } from "@prisma/tenant-client";
import { AREA_DETAIL_INCLUDE, AREA_LIST_INCLUDE, AREA_TREE } from "./constants";

export type AreaDetail = Prisma.AreaGetPayload<{ include: typeof AREA_DETAIL_INCLUDE }>;
export type AreaListItem = Prisma.AreaGetPayload<{ include: typeof AREA_LIST_INCLUDE }>;
export type AreaTree = Prisma.AreaGetPayload<{ select: typeof AREA_TREE.select }>;
