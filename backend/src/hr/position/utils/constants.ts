import { Prisma } from "@prisma/tenant-client";

// _count.contracts backs the sortable "Employees" column and its list-row badge
// (frontend/app/dashboard/hr/positions/page.tsx) — without it the column silently
// always renders 0, since the field was never selected (#1).
export const POSITION_DETAIL_INCLUDE = {
  _count: { select: { contracts: true } },
} satisfies Prisma.PositionInclude;
