export function getPagination(page?: number, limit?: number, maxLimit = 100) {
  const pageNumber = Math.max(page ?? 1, 1);
  const limitNumber = Math.min(Math.max(limit ?? 20, 1), maxLimit);

  return {
    page: pageNumber,
    limit: limitNumber,
    skip: (pageNumber - 1) * limitNumber,
  };
}

export interface PaginationResult {
  page: number;
  limit: number;
  skip: number;
}
