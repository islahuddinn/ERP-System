import { PurchaseStatus } from "@prisma/tenant-client";
import { GrnService } from "../grn/grn.service";

function remainingQty(ordered: number, alreadyReceived: number): number {
  return Math.max(0, ordered - alreadyReceived);
}

describe("golden rule: stock conservation", () => {
  it("remaining PO quantity is ordered minus already received", () => {
    expect(remainingQty(10, 8)).toBe(2);
    expect(remainingQty(10, 10)).toBe(0);
  });

  it("a GRN cannot take more than remaining PO quantity", async () => {
    const prisma = {
      purchaseOrder: {
        findUnique: jest.fn().mockResolvedValue({
          status: PurchaseStatus.CONFIRMED,
          items: [
            {
              rawMaterialId: "rm-1",
              quantity: 10,
              receivedQty: 8,
              unitPrice: 1,
              rawMaterial: { name: "Flour" },
            },
          ],
        }),
      },
      gRN: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    const service = new GrnService({} as any, prisma as any, { postBalancedEntry: jest.fn() } as any);

    await expect(
      service.create(
        {
          purchaseOrderId: "po-1",
          receivedDate: "2026-09-08",
          items: [{ rawMaterialId: "rm-1", receivedQuantity: 3, batches: [] }],
        } as any,
        { user: { id: "user-1" } } as any,
      ),
    ).rejects.toThrow(/exceeds the remaining purchase order quantity/);
  });
});
