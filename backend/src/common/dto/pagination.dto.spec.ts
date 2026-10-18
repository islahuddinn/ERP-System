import { buildPaginatedResponse } from "./pagination.dto";

describe("buildPaginatedResponse", () => {
  it("computes totalPages, hasNext, and hasPrev", () => {
    const page1 = buildPaginatedResponse([{ id: 1 }], 25, 1, 10);
    expect(page1.meta).toEqual({
      total: 25,
      page: 1,
      limit: 10,
      totalPages: 3,
      hasNext: true,
      hasPrev: false,
    });

    const page3 = buildPaginatedResponse([{ id: 3 }], 25, 3, 10);
    expect(page3.meta.hasNext).toBe(false);
    expect(page3.meta.hasPrev).toBe(true);
  });
});
