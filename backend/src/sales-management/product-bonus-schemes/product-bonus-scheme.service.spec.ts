import { BadRequestException } from "@nestjs/common";
import { ProductBonusSchemeService } from "./product-bonus-scheme.service";

describe("ProductBonusSchemeService", () => {
  const repository = { create: jest.fn(), findById: jest.fn(), findAll: jest.fn(), update: jest.fn(), delete: jest.fn() };
  const productBonusGroupService = { checkExistence: jest.fn().mockResolvedValue({ id: "grp-1" }) };
  const auditContext = { setOldValue: jest.fn(), setEntityLabel: jest.fn() };
  const service = new ProductBonusSchemeService(
    repository as any,
    productBonusGroupService as any,
    auditContext as any,
  );

  it("rejects a scheme whose validTo is before validFrom", async () => {
    await expect(
      service.createProductBonusScheme({
        code: "B1",
        name: "Buy 10 get 1",
        productBonusGroupId: "grp-1",
        minPurchaseQty: 10,
        bonusQty: 1,
        validFrom: "2026-09-30",
        validTo: "2026-09-01",
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.create).not.toHaveBeenCalled();
  });

  it("creates a scheme when the date range is valid", async () => {
    repository.create.mockResolvedValue({ id: "sch-1", minPurchaseQty: 10, bonusQty: 1 });

    const created = await service.createProductBonusScheme({
      code: "B1",
      name: "Buy 10 get 1",
      productBonusGroupId: "grp-1",
      minPurchaseQty: 10,
      bonusQty: 1,
      validFrom: "2026-09-01",
      validTo: "2026-12-31",
    } as any);

    expect(created.id).toBe("sch-1");
    expect(productBonusGroupService.checkExistence).toHaveBeenCalledWith("grp-1");
  });
});
