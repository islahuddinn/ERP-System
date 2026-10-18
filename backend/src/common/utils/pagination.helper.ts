import { PaginatedResponse, SortOrder } from "../dto/pagination.dto";

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);

  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

export function getPaginationParams(page: number = 1, limit: number = 10) {
  const skip = (page - 1) * limit;
  const take = limit;

  return { skip, take };
}

export function buildSearchFilter(search: string, fields: string[]) {
  return fields.map((field) => ({
    [field]: { contains: search, mode: "insensitive" as const },
  }));
}

// Build a Prisma `orderBy` object. Supports sorting by a scalar column
// (`"name"` -> `{ name: "asc" }`) AND by a nested relation field using dot
// notation (`"uom.name"` -> `{ uom: { name: "asc" } }`, or
// `"purchaseOrder.supplier.name"` -> `{ purchaseOrder: { supplier: { name: "asc" } } }`).
// Relation columns in the DataTable declare `sortKey: "relation.field"` and this
// turns it into the nested shape Prisma requires (a bare `{ relation: "asc" }` is
// invalid and was silently ignored — that's why relation columns "couldn't sort").
export function buildOrderBy(
  sortBy: string = "createdAt",
  sortOrder: SortOrder = SortOrder.DESC,
): Record<string, any> {
  const direction = sortOrder.toLowerCase();
  if (!sortBy.includes(".")) {
    return { [sortBy]: direction };
  }
  // Fold the dotted path from the inside out into a nested object.
  // `split(".")` returns a fresh array, so `reverse()` (in place) is safe here.
  return sortBy
    .split(".")
    .reverse()
    .reduce<any>((acc, key, idx) => (idx === 0 ? { [key]: direction } : { [key]: acc }), {});
}
