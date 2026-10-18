import { Prisma } from "@prisma/tenant-client";

export const BROKER_LIST_SELECT = {
  id: true,
  brokerCode: true,
  name: true,
  contactPerson: true,
  phone: true,
  email: true,
  address: true,
  areaId: true,
  salesTarget: true,
  commissionRate: true,
  status: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.BrokerSelect;

export const BROKER_DETAIL_SELECT = {
  ...BROKER_LIST_SELECT,
  zoneId: true,
  createdById: true,
  updatedById: true,
} satisfies Prisma.BrokerSelect;

export const BROKER_SORTABLE_FIELDS = [
  "brokerCode",
  "name",
  "status",
  "commissionRate",
  "salesTarget",
  "createdAt",
  "updatedAt",
];
