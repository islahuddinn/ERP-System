import { Prisma } from "@prisma/tenant-client";
import { CUSTOMER_ORDER_DETAIL_INCLUDE, CUSTOMER_ORDER_LIST_INCLUDE } from "./constants";

export type CustomerOrderDetail = Prisma.CustomerOrderGetPayload<{
  include: typeof CUSTOMER_ORDER_DETAIL_INCLUDE;
}>;

export type CustomerOrderListItem = Prisma.CustomerOrderGetPayload<{
  include: typeof CUSTOMER_ORDER_LIST_INCLUDE;
}>;
