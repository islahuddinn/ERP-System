import { Prisma } from "@prisma/tenant-client";
import { SHIFT_DETAIL_INCLUDE } from "./constants";

export type ShiftDetail = Prisma.ShiftGetPayload<{
  include: typeof SHIFT_DETAIL_INCLUDE;
}>;
