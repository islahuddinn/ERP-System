import { Position, Prisma } from "@prisma/tenant-client";
import { POSITION_DETAIL_INCLUDE } from "./constants";

export type PositionDetail = Prisma.PositionGetPayload<{
  include: typeof POSITION_DETAIL_INCLUDE;
}> & { employeeCount: number };

export type PositionWithEmployeeCount = Position & { employeeCount: number };
