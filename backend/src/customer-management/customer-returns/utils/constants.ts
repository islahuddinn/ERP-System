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

// Delivery + its parent delivery number — approve() needs the parent
// delivery's salesPersonId to resolve which branch to restock.
const DELIVERY_ITEM_LOOKUP_SELECT = {
  id: true,
  quantity: true,
  unitPrice: true,
  delivery: { select: { id: true, deliveryNumber: true, salesPersonId: true } },
} satisfies Prisma.CustomerDeliveryItemSelect;

export const CUSTOMER_RETURN_DETAIL_INCLUDE = {
  customer: { select: CUSTOMER_LOOKUP_SELECT },
  salesPerson: { select: SALES_PERSON_SELECT },
  approvedBy: { select: SALES_PERSON_SELECT },
  product: { select: PRODUCT_LOOKUP_SELECT },
  deliveryItem: { select: DELIVERY_ITEM_LOOKUP_SELECT },
} satisfies Prisma.CustomerReturnInclude;

export const CUSTOMER_RETURN_LIST_INCLUDE = CUSTOMER_RETURN_DETAIL_INCLUDE;
