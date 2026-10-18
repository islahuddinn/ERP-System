import { Prisma } from "@prisma/tenant-client";
import { CUSTOMER_RECOVERY_DETAIL_INCLUDE } from "./constants";

export type CustomerRecoveryDetail = Prisma.CustomerRecoveryGetPayload<{
  include: typeof CUSTOMER_RECOVERY_DETAIL_INCLUDE;
}>;
