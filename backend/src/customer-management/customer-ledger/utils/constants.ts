import { Prisma } from "@prisma/tenant-client";

export const CUSTOMER_LEDGER_HEADER_SELECT = {
  id: true,
  code: true,
  shopName: true,
  email: true,
  phone: true,
  address: true,
  createdAt: true,
} satisfies Prisma.CustomerSelect;
