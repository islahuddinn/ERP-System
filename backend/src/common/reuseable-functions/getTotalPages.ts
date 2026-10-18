export const getTotalPages = (total: number, limit?: number): number => {
  return Math.ceil(total / (limit ?? 1));
};
