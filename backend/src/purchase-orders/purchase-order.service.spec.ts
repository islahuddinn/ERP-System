import { BadRequestException, NotFoundException } from "@nestjs/common";
import { POApprovalStatus, PurchaseStatus } from "@prisma/tenant-client";
import { PurchaseOrderService } from "./purchase-order.service";

function buildService() {
  const purchaseOrderRepository = {
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findAll: jest.fn(),
    generateOrderNumber: jest.fn(),
    validateRawMaterialIds: jest.fn(),
    validateApproverIds: jest.fn(),
    countCompletedGRNs: jest.fn(),
    dropdown: jest.fn(),
    getPayments: jest.fn(),
  };
  const auditContext = { setOldValue: jest.fn(), setEntityLabel: jest.fn() };
  const prisma = {};
  const service = new PurchaseOrderService(
    purchaseOrderRepository as any,
    auditContext as any,
    prisma as any,
  );
  return { service, purchaseOrderRepository };
}

const req = { user: { id: "user-1" } } as any;

describe("PurchaseOrderService", () => {
  it("creates a PO with line totals plus shipping", async () => {
    const { service, purchaseOrderRepository } = buildService();
    purchaseOrderRepository.generateOrderNumber.mockResolvedValue("PO-001");
    purchaseOrderRepository.create.mockImplementation(async (header) => header);

    const result = await service.create(
      {
        supplierId: "sup-1",
        shippingCost: 100,
        approverIds: ["appr-1"],
        items: [
          { rawMaterialId: "rm-1", quantity: 2, unitPrice: 50 },
          { rawMaterialId: "rm-2", quantity: 1, unitPrice: 30 },
        ],
      } as any,
      req,
    );

    expect(purchaseOrderRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ subTotal: 130, shippingCost: 100, totalAmount: 230 }),
      expect.any(Array),
      ["appr-1"],
    );
    expect(result.totalAmount).toBe(230);
  });

  it("throws when the purchase order does not exist", async () => {
    const { service, purchaseOrderRepository } = buildService();
    purchaseOrderRepository.findById.mockResolvedValue(null);
    await expect(service.findOne("missing")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("blocks DRAFT → RECEIVED (must confirm first)", async () => {
    const { service, purchaseOrderRepository } = buildService();
    purchaseOrderRepository.findById.mockResolvedValue({
      id: "po-1",
      status: PurchaseStatus.DRAFT,
      items: [{ id: "i1" }],
      approvals: [],
      orderNumber: "PO-001",
    });

    await expect(service.updateStatus("po-1", PurchaseStatus.RECEIVED, req)).rejects.toThrow(
      /Cannot transition/,
    );
  });

  it("blocks confirming a rejected purchase order", async () => {
    const { service, purchaseOrderRepository } = buildService();
    purchaseOrderRepository.findById.mockResolvedValue({
      id: "po-1",
      status: PurchaseStatus.DRAFT,
      items: [{ id: "i1" }],
      approvals: [{ status: POApprovalStatus.REJECTED }],
      orderNumber: "PO-001",
    });

    await expect(service.updateStatus("po-1", PurchaseStatus.CONFIRMED, req)).rejects.toThrow(
      /rejected purchase order/i,
    );
  });
});
