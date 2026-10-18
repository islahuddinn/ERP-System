import { CustomerLedgerAdjustmentType } from "@prisma/tenant-client";
import { CustomerLedgerAdjustmentsService } from "./customer-ledger-adjustments.service";
import { GlPostingKind, GlSourceType } from "../../financial/gl-posting/utils/enums";

describe("CustomerLedgerAdjustmentsService", () => {
  const repository = { create: jest.fn(), findById: jest.fn(), findAll: jest.fn() };
  const customersService = { checkExistence: jest.fn() };
  const glPostingService = { postBalancedEntry: jest.fn() };
  const service = new CustomerLedgerAdjustmentsService(
    repository as any,
    customersService as any,
    glPostingService as any,
  );
  const req = { user: { id: "user-1" } } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    customersService.checkExistence.mockResolvedValue({ id: "cust-1" });
    repository.create.mockResolvedValue({
      id: "adj-1",
      adjustmentNumber: "CN-0001",
      type: CustomerLedgerAdjustmentType.CREDIT_NOTE,
      amount: 250,
    });
  });

  it("posts Dr Revenue / Cr AR for a credit note", async () => {
    await service.createCustomerLedgerAdjustment(
      {
        customerId: "cust-1",
        type: CustomerLedgerAdjustmentType.CREDIT_NOTE,
        amount: 250,
        reason: "Goodwill",
      } as any,
      req,
    );

    expect(glPostingService.postBalancedEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: GlSourceType.CUSTOMER_LEDGER_ADJUSTMENT,
        sourceId: "adj-1",
        postingKind: GlPostingKind.CREDIT_NOTE,
        lines: [
          expect.objectContaining({ accountKey: "SALES_REVENUE", debit: 250 }),
          expect.objectContaining({ accountKey: "AR", credit: 250 }),
        ],
      }),
    );
  });

  it("posts Dr AR / Cr Revenue for a debit note", async () => {
    repository.create.mockResolvedValue({
      id: "adj-2",
      adjustmentNumber: "DN-0001",
      type: CustomerLedgerAdjustmentType.DEBIT_NOTE,
      amount: 80,
    });

    await service.createCustomerLedgerAdjustment(
      {
        customerId: "cust-1",
        type: CustomerLedgerAdjustmentType.DEBIT_NOTE,
        amount: 80,
        reason: "Short delivery billed",
      } as any,
      req,
    );

    expect(glPostingService.postBalancedEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        postingKind: GlPostingKind.DEBIT_NOTE,
        lines: [
          expect.objectContaining({ accountKey: "AR", debit: 80 }),
          expect.objectContaining({ accountKey: "SALES_REVENUE", credit: 80 }),
        ],
      }),
    );
  });
});
