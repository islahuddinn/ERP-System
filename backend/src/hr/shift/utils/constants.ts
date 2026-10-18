import { Prisma } from "@prisma/tenant-client";

export const SHIFT_DETAIL_INCLUDE = {
  _count: { select: { employees: true } },
} satisfies Prisma.ShiftInclude;
