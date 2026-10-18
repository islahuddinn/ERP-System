import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PurchaseStatus } from "@prisma/tenant-client";
import { GrnService } from "./grn.service";

function po(overrides?: Partial<{ status: PurchaseStatus; receivedQty: number; quantity: number }>) {
  return {
    status: overrides?.status ?? PurchaseStatus.CONFIRMED,
    items: [
      {
        rawMaterialId: "rm-1",
        quantity: overrides?.quantity ?? 10,
        receivedQty: overrides?.receivedQty ?? 0,
        unitPrice: 50,
        rawMaterial: { name: "Flour" },
      },
    ],
  };
}

function buildService() {
  const grnRepository = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    getGrnStats: jest.fn(),
    getMaxReceivingSequence: jest.fn().mockResolvedValue(0),
  };
  const prisma = {
    purchaseOrder: { findUnique: jest.fn() },
    rawMaterial: { findMany: jest.fn() },
    uOM: { findMany: jest.fn() },
    site: { findMany: jest.fn() },
  };
  const glPostingService = { postBalancedEntry: jest.fn() };
  const service = new GrnService(grnRepository as any, prisma as any, glPostingService as any);
  return { service, prisma, grnRepository, glPostingService };
}

const req = { user: { id: "user-1" } } as any;

describe("GrnService.create", () => {
  it("rejects a GRN against a missing purchase order", async () => {
    const { service, prisma } = buildService();
    prisma.purchaseOrder.findUnique.mockResolvedValue(null);

    await expect(
      service.create({ purchaseOrderId: "po-missing", items: [], receivedDate: "2026-09-08" } as any, req),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects a GRN against a draft purchase order", async () => {
    const { service, prisma } = buildService();
    prisma.purchaseOrder.findUnique.mockResolvedValue(po({ status: PurchaseStatus.DRAFT }));

    await expect(
      service.create(
        { purchaseOrderId: "po-1", items: [{ rawMaterialId: "rm-1", receivedQuantity: 1 }], receivedDate: "2026-09-08" } as any,
        req,
      ),
    ).rejects.toThrow(/draft purchase order/i);
  });

  it("allows a partial GRN when not all PO lines are included", async () => {
    const { service, prisma, grnRepository } = buildService();
    prisma.purchaseOrder.findUnique.mockResolvedValue({
      status: PurchaseStatus.CONFIRMED,
      items: [
        {
          rawMaterialId: "rm-1",
          quantity: 10,
          receivedQty: 0,
          unitPrice: 50,
          rawMaterial: { name: "Flour" },
        },
        {
          rawMaterialId: "rm-2",
          quantity: 5,
          receivedQty: 0,
          unitPrice: 20,
          rawMaterial: { name: "Sugar" },
        },
      ],
    });
    prisma.rawMaterial.findMany.mockResolvedValue([{ id: "rm-1" }]);
    prisma.uOM.findMany.mockResolvedValue([{ id: "uom-1" }]);
    prisma.site.findMany.mockResolvedValue([{ id: "site-1" }]);
    grnRepository.create.mockResolvedValue({ id: "grn-1", receivingNumber: "GRN-001" });

    await expect(
      service.create(
        {
          purchaseOrderId: "po-1",
          items: [
            {
              rawMaterialId: "rm-1",
              uomId: "uom-1",
              expectedQuantity: 10,
              receivedQuantity: 4,
              batches: [{ siteId: "site-1", quantity: 4 }],
            },
          ],
          receivedDate: "2026-09-08",
        } as any,
        req,
      ),
    ).resolves.toBeDefined();
  });

  it("rejects over-receiving against remaining PO quantity", async () => {
    const { service, prisma } = buildService();
    prisma.purchaseOrder.findUnique.mockResolvedValue(po({ quantity: 10, receivedQty: 8 }));

    await expect(
      service.create(
        {
          purchaseOrderId: "po-1",
          items: [{ rawMaterialId: "rm-1", receivedQuantity: 5, batches: [] }],
          receivedDate: "2026-09-08",
        } as any,
        req,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
