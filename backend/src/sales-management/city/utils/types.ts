import { Prisma } from "@prisma/tenant-client";
import { CITY_DETAIL_INCLUDE, CITY_LIST_INCLUDE, CITY_TREE } from "./constants";

export type CityDetail = Prisma.CityGetPayload<{ include: typeof CITY_DETAIL_INCLUDE }>;
export type CityListItem = Prisma.CityGetPayload<{ include: typeof CITY_LIST_INCLUDE }>;
export type CityTree = Prisma.CityGetPayload<{ select: typeof CITY_TREE.select }>;
