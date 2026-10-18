import { BadRequestException } from "@nestjs/common";
import { GlPostingService } from "../financial/gl-posting/gl-posting.service";
import { GlPostingKind, GlSourceType } from "../financial/gl-posting/utils/enums";

describe("golden rule: posted journals always balance", () => {
  const service = new GlPostingService(
    { findBySource: jest.fn(), createPostedEntry: jest.fn(), nextEntryNumber: jest.fn() } as any,
    { resolveAccountIds: jest.fn() } as any,
  );

  it("rejects an unbalanced entry before any write", async () => {
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
  });
});
