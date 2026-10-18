import { Prisma } from "@prisma/tenant-client";
import { FACTORY_STOCK_BALANCE_INCLUDE } from "./constants";

export type FactoryStockBalanceDetail = Prisma.FactoryStockBalanceGetPayload<{
  include: typeof FACTORY_STOCK_BALANCE_INCLUDE;
}>;
