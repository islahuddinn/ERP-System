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

const ORDER_ITEM_INCLUDE = {
  product: { select: PRODUCT_LOOKUP_SELECT },
} satisfies Prisma.CustomerOrderItemInclude;

const ORDER_DELIVERY_SELECT = {
  id: true,
  deliveryNumber: true,
  status: true,
  deliveredAt: true,
} satisfies Prisma.CustomerDeliverySelect;

export const CUSTOMER_ORDER_DETAIL_INCLUDE = {
  customer: { select: CUSTOMER_LOOKUP_SELECT },
  salesPerson: { select: SALES_PERSON_SELECT },
  items: { include: ORDER_ITEM_INCLUDE },
  deliveries: { select: ORDER_DELIVERY_SELECT },
} satisfies Prisma.CustomerOrderInclude;

export const CUSTOMER_ORDER_LIST_INCLUDE = {
  customer: { select: CUSTOMER_LOOKUP_SELECT },
  salesPerson: { select: SALES_PERSON_SELECT },
  _count: { select: { items: true, deliveries: true } },
} satisfies Prisma.CustomerOrderInclude;
