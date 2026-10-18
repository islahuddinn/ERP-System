import { BadRequestException } from "@nestjs/common";
import { GlPostingService } from "./gl-posting.service";
import { GlPostingKind, GlSourceType } from "./utils/enums";

describe("GlPostingService", () => {
  const repository = {
    findBySource: jest.fn(),
    createPostedEntry: jest.fn(),
    nextEntryNumber: jest.fn().mockResolvedValue("JE20260908001"),
  };
  const resolver = {
    resolveAccountIds: jest.fn().mockResolvedValue({
      CASH: "cash-id",
      SALES_REVENUE: "rev-id",
      AR: "ar-id",
    }),
  };

  const service = new GlPostingService(repository as any, resolver as any);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findBySource.mockResolvedValue(null);
    repository.createPostedEntry.mockImplementation(async (data) => ({ id: "je-1", ...data }));
  });

  it("rejects an unbalanced entry", async () => {
    await expect(
      service.postBalancedEntry({
        sourceType: GlSourceType.SALE,
        sourceId: "sale-1",
        postingKind: GlPostingKind.RECOGNIZE_REVENUE,
        entryDate: new Date("2026-09-08"),
        description: "unbalanced",
        lines: [
          { accountKey: "CASH", debit: 100, credit: 0 },
          { accountKey: "SALES_REVENUE", debit: 0, credit: 90 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.createPostedEntry).not.toHaveBeenCalled();
  });

  it("returns the existing journal on a retry (idempotent)", async () => {
    repository.findBySource.mockResolvedValue({ id: "existing-je" });

    const result = await service.postBalancedEntry({
      sourceType: GlSourceType.SALE,
      sourceId: "sale-1",
      postingKind: GlPostingKind.RECOGNIZE_REVENUE,
      entryDate: new Date("2026-09-08"),
      description: "sale",
      lines: [
        { accountKey: "CASH", debit: 50, credit: 0 },
        { accountKey: "SALES_REVENUE", debit: 0, credit: 50 },
      ],
    });

    expect(result).toEqual({ id: "existing-je" });
    expect(repository.createPostedEntry).not.toHaveBeenCalled();
  });

  it("posts a balanced cash + AR sale", async () => {
    await service.postBalancedEntry({
      sourceType: GlSourceType.SALE,
      sourceId: "sale-2",
      postingKind: GlPostingKind.RECOGNIZE_REVENUE,
      entryDate: new Date("2026-09-08"),
      description: "sale",
      lines: [
        { accountKey: "CASH", debit: 40, credit: 0 },
        { accountKey: "AR", debit: 60, credit: 0 },
        { accountKey: "SALES_REVENUE", debit: 0, credit: 100 },
      ],
    });

    expect(repository.createPostedEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        totalDebit: 100,
        totalCredit: 100,
        sourceType: GlSourceType.SALE,
        postingKind: GlPostingKind.RECOGNIZE_REVENUE,
      }),
    );
  });

  it("skips a zero-amount posting instead of writing a journal", async () => {
    const result = await service.postBalancedEntry({
      sourceType: GlSourceType.SALE,
      sourceId: "sale-0",
      postingKind: GlPostingKind.RECOGNIZE_REVENUE,
      entryDate: new Date("2026-09-08"),
      description: "empty",
      lines: [
        { accountKey: "CASH", debit: 0, credit: 0 },
        { accountKey: "SALES_REVENUE", debit: 0, credit: 0 },
      ],
    });

    expect(result).toBeNull();
    expect(repository.createPostedEntry).not.toHaveBeenCalled();
  });

  it("rejects a line that has both debit and credit", async () => {
    await expect(
      service.postBalancedEntry({
        sourceType: GlSourceType.SALE,
        sourceId: "sale-both",
        postingKind: GlPostingKind.RECOGNIZE_REVENUE,
        entryDate: new Date("2026-09-08"),
        description: "invalid line",
        lines: [
          { accountKey: "CASH", debit: 50, credit: 10 },
          { accountKey: "SALES_REVENUE", debit: 0, credit: 40 },
        ],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
