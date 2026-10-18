import { Prisma } from "@prisma/tenant-client";
import { CUSTOMER_DETAIL_INCLUDE, CUSTOMER_LIST_INCLUDE } from "./constants";

export type CustomerDetail = Prisma.CustomerGetPayload<{
  include: typeof CUSTOMER_DETAIL_INCLUDE;
}>;

export type CustomerListItem = Prisma.CustomerGetPayload<{
  include: typeof CUSTOMER_LIST_INCLUDE;
}>;
