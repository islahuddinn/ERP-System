import { Prisma } from "@prisma/tenant-client";
import { CUSTOMER_RETURN_DETAIL_INCLUDE } from "./constants";

export type CustomerReturnDetail = Prisma.CustomerReturnGetPayload<{
  include: typeof CUSTOMER_RETURN_DETAIL_INCLUDE;
}>;
