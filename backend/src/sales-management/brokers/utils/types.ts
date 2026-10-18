import { Prisma } from "@prisma/tenant-client";
import { BROKER_DETAIL_SELECT, BROKER_LIST_SELECT } from "./constants";

export type BrokerListItem = Prisma.BrokerGetPayload<{ select: typeof BROKER_LIST_SELECT }>;
export type BrokerDetail = Prisma.BrokerGetPayload<{ select: typeof BROKER_DETAIL_SELECT }>;

export type BrokerPerformance = {
  broker: {
    id: string;
    name: string;
    brokerCode: string;
    commissionRate: number;
    salesTarget: number;
  };
  totalSales: number;
  totalCommission: number;
  paidCommission: number;
  pendingCommission: number;
  salesCount: number;
  salesTarget: number;
  achievement: number;
  salesAttributed: boolean;
  sales: unknown[];
};
