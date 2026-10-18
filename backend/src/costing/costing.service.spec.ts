import { CostingService } from "./costing.service";
import { CostPeriod } from "./dto/costing.dto";

describe("CostingService.getDateRange", () => {
  const service = new CostingService();
  const getDateRange = (period?: CostPeriod, start?: string, end?: string) =>
    (service as any).getDateRange(period, start, end) as { startDate: Date; endDate: Date };

  it("uses an inclusive custom range when asked", () => {
    const range = getDateRange(CostPeriod.CUSTOM, "2026-01-15", "2026-01-20");
    expect(range.startDate).toEqual(new Date("2026-01-15"));
    expect(range.endDate).toEqual(new Date("2026-01-20"));
  });

  it("defaults to the current calendar month", () => {
    const range = getDateRange(CostPeriod.THIS_MONTH);
    const now = new Date();
    expect(range.startDate.getFullYear()).toBe(now.getFullYear());
    expect(range.startDate.getMonth()).toBe(now.getMonth());
    expect(range.startDate.getDate()).toBe(1);
    expect(range.endDate.getMonth()).toBe(now.getMonth());
  });

  it("returns last month as a closed range", () => {
    const range = getDateRange(CostPeriod.LAST_MONTH);
    const last = new Date();
    last.setMonth(last.getMonth() - 1);
    expect(range.startDate.getMonth()).toBe(last.getMonth());
    expect(range.startDate.getDate()).toBe(1);
    expect(range.endDate.getMonth()).toBe(last.getMonth());
  });
});
