import { Prisma } from "@prisma/tenant-client";

const CUSTOMER_LOOKUP_SELECT = {
  id: true,
  code: true,
  shopName: true,
} satisfies Prisma.CustomerSelect;

const SALES_PERSON_SELECT = {
  id: true,
  employeeCode: true,
  user: { select: { id: true, firstName: true, lastName: true, phone: true } },
} satisfies Prisma.EmployeeSelect;

const PRODUCT_LOOKUP_SELECT = {
  id: true,
  name: true,
  code: true,
} satisfies Prisma.ProductSelect;

const ORDER_LOOKUP_SELECT = {
  id: true,
  orderNumber: true,
  status: true,
} satisfies Prisma.CustomerOrderSelect;

const DELIVERY_ITEM_INCLUDE = {
  product: { select: PRODUCT_LOOKUP_SELECT },
} satisfies Prisma.CustomerDeliveryItemInclude;

export const CUSTOMER_DELIVERY_DETAIL_INCLUDE = {
  customer: { select: CUSTOMER_LOOKUP_SELECT },
  salesPerson: { select: SALES_PERSON_SELECT },
  deliveredBy: { select: SALES_PERSON_SELECT },
  order: { select: ORDER_LOOKUP_SELECT },
  items: { include: DELIVERY_ITEM_INCLUDE },
} satisfies Prisma.CustomerDeliveryInclude;

export const CUSTOMER_DELIVERY_LIST_INCLUDE = {
  customer: { select: CUSTOMER_LOOKUP_SELECT },
  salesPerson: { select: SALES_PERSON_SELECT },
  deliveredBy: { select: SALES_PERSON_SELECT },
  order: { select: ORDER_LOOKUP_SELECT },
  _count: { select: { items: true } },
} satisfies Prisma.CustomerDeliveryInclude;

// Used by CustomerReturnsService to derive a return's product/price/shop
// straight from the delivery item it's against — includes the parent
// delivery's customerId/salesPersonId, which the return needs but a bare
// delivery item doesn't carry on its own.
export const CUSTOMER_DELIVERY_ITEM_DETAIL_INCLUDE = {
  product: { select: PRODUCT_LOOKUP_SELECT },
  delivery: { select: { id: true, deliveryNumber: true, customerId: true, salesPersonId: true } },
} satisfies Prisma.CustomerDeliveryItemInclude;
