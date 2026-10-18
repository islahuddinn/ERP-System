import { Prisma } from "@prisma/tenant-client";

const CUSTOMER_CATEGORY_LOOKUP_SELECT = {
  id: true,
  name: true,
  status: true,
} satisfies Prisma.CustomerCategorySelect;

const AREA_LOOKUP_SELECT = {
  id: true,
  name: true,
  branch: {
    select: {
      id: true,
      name: true,
      city: { select: { id: true, name: true } },
    },
  },
} satisfies Prisma.AreaSelect;

const RECENT_SALES_SELECT = {
  id: true,
  saleNumber: true,
  saleDate: true,
  totalAmount: true,
  status: true,
  paymentStatus: true,
} satisfies Prisma.SaleSelect;

export const CUSTOMER_DETAIL_INCLUDE = {
  category: { select: CUSTOMER_CATEGORY_LOOKUP_SELECT },
  area: { select: AREA_LOOKUP_SELECT },
  sales: {
    select: RECENT_SALES_SELECT,
    orderBy: { saleDate: "desc" as const },
    take: 10,
  },
} satisfies Prisma.CustomerInclude;

export const CUSTOMER_LIST_INCLUDE = {
  category: { select: CUSTOMER_CATEGORY_LOOKUP_SELECT },
  area: { select: AREA_LOOKUP_SELECT },
} satisfies Prisma.CustomerInclude;
