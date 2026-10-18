import { Prisma } from "@prisma/tenant-client";
import {
  CUSTOMER_DELIVERY_DETAIL_INCLUDE,
  CUSTOMER_DELIVERY_ITEM_DETAIL_INCLUDE,
  CUSTOMER_DELIVERY_LIST_INCLUDE,
} from "./constants";

export type CustomerDeliveryDetail = Prisma.CustomerDeliveryGetPayload<{
  include: typeof CUSTOMER_DELIVERY_DETAIL_INCLUDE;
}>;

export type CustomerDeliveryListItem = Prisma.CustomerDeliveryGetPayload<{
  include: typeof CUSTOMER_DELIVERY_LIST_INCLUDE;
}>;

export type CustomerDeliveryItemDetail = Prisma.CustomerDeliveryItemGetPayload<{
  include: typeof CUSTOMER_DELIVERY_ITEM_DETAIL_INCLUDE;
}>;
