import { Test, TestingModule } from "@nestjs/testing";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { StockLedgerService } from "./stock-ledger.service";
import { PrismaClient, StockTransactionType, RawMaterialBatchStatus } from "@prisma/tenant-client";
import { CapacityService } from "./capacity.service";

describe("StockLedgerService", () => {
  let service: StockLedgerService;
  let mockTenantClient: any;
  let mockCapacityService: any;

  const mockProduct = {
    id: "product-1",
    name: "Test Product",
    sku: "TEST-001",
    isActive: true,
  };

  const mockWarehouse = {
    id: "warehouse-1",
    name: "Main Warehouse",
    code: "WH-001",
    capacity: 1000,
  };

  const mockZone = {
    id: "zone-1",
    name: "Zone A",
    code: "ZONE-A",
    warehouseId: "warehouse-1",
  };

  const mockUser = {
    id: "user-1",
    name: "Test User",
    email: "test@example.com",
  };

  beforeEach(() => {
    mockTenantClient = {
      product: {
        findUnique: jest.fn(),
      },
      warehouse: {
        findUnique: jest.fn(),
      },
      warehouseZone: {
        findUnique: jest.fn(),
      },
      batch: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      warehouseStockBalance: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        upsert: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      rawMaterialBatch: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      stockLedger: {
        create: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
        aggregate: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockTenantClient)),
      $queryRaw: jest.fn().mockResolvedValue([]),
    };

    // Default mock for findUnique to return batches/products if ID matches
    mockTenantClient.rawMaterialBatch.findUnique.mockImplementation(({ where }: any) => {
      if (where.id === "batch-1")
        return {
          id: "batch-1",
          availableQty: 100,
          quantity: 100,
          consumedQuantity: 0,
          status: RawMaterialBatchStatus.ACTIVE,
        };
      if (where.id === "batch-2")
        return {
          id: "batch-2",
          availableQty: 100,
          quantity: 100,
          consumedQuantity: 0,
          status: RawMaterialBatchStatus.ACTIVE,
        };
      return null;
    });

    mockTenantClient.product.findUnique.mockImplementation(({ where }: any) => {
      if (where.id === "product-1") return mockProduct;
      return null;
    });

    mockCapacityService = {
      checkCapacity: jest.fn().mockResolvedValue(true),
      updateCapacity: jest.fn().mockResolvedValue(undefined),
      checkWarehouseCapacity: jest.fn().mockResolvedValue(true),
      adjustCapacity: jest.fn().mockResolvedValue(true),
    };

    service = new StockLedgerService(mockCapacityService as unknown as CapacityService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const mockStockSum = (available: number, physical: number = available) => {
    mockTenantClient.$queryRaw.mockResolvedValue([
      {
        totalAvailable: available,
        totalPhysical: physical,
        availableQuantity: available,
        quantity: physical,
        reservedQuantity: 0,
      },
    ]);
    mockTenantClient.warehouseStockBalance.findUnique.mockResolvedValue({
      availableQuantity: available,
      quantity: physical,
      reservedQuantity: 0,
    });
    mockTenantClient.warehouseStockBalance.findFirst.mockResolvedValue({
      availableQuantity: available,
      quantity: physical,
      reservedQuantity: 0,
    });
    mockTenantClient.warehouseStockBalance.findMany.mockResolvedValue([
      {
        productId: "product-1",
        quantity: physical,
        reservedQuantity: 0,
        availableQuantity: available,
        zoneId: null,
      },
    ]);
    mockTenantClient.warehouse.findUnique.mockResolvedValue(mockWarehouse);
  };

  describe("recordMovement - Validation", () => {
    it("should throw NotFoundException if product does not exist", async () => {
      mockTenantClient.product.findUnique.mockResolvedValue(null);

      await expect(
        service.recordMovement(mockTenantClient, {
          productId: "non-existent",
          quantity: 10,
          movementType: StockTransactionType.IN,
          referenceType: "PURCHASE",
          referenceId: "ref-1",
          userId: "user-1",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException if warehouse does not exist", async () => {
      mockTenantClient.product.findUnique.mockResolvedValue(mockProduct);
      mockTenantClient.warehouse.findUnique.mockResolvedValue(null);

      await expect(
        service.recordMovement(mockTenantClient, {
          productId: "product-1",
          warehouseId: "non-existent",
          quantity: 10,
          movementType: StockTransactionType.IN,
          referenceType: "PURCHASE",
          referenceId: "ref-1",
          userId: "user-1",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException if zone does not exist", async () => {
      mockTenantClient.product.findUnique.mockResolvedValue(mockProduct);
      mockTenantClient.warehouse.findUnique.mockResolvedValue(mockWarehouse);
      mockTenantClient.warehouseZone.findUnique.mockResolvedValue(null);

      await expect(
        service.recordMovement(mockTenantClient, {
          productId: "product-1",
          warehouseId: "warehouse-1",
          zoneId: "non-existent",
          quantity: 10,
          movementType: StockTransactionType.IN,
          referenceType: "PURCHASE",
          referenceId: "ref-1",
          userId: "user-1",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw BadRequestException for zero quantity (non-adjustment)", async () => {
      mockTenantClient.product.findUnique.mockResolvedValue(mockProduct);

      await expect(
        service.recordMovement(mockTenantClient, {
          productId: "product-1",
          quantity: 0,
          movementType: StockTransactionType.IN,
          referenceType: "PURCHASE",
          referenceId: "ref-1",
          userId: "user-1",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("recordMovement - Stock Increase", () => {
    it("should create new batch when batch info provided", async () => {
      mockTenantClient.product.findUnique.mockResolvedValue(mockProduct);
      mockTenantClient.warehouse.findUnique.mockResolvedValue(mockWarehouse);
      mockTenantClient.rawMaterialBatch.findUnique.mockResolvedValue(null);
      mockTenantClient.rawMaterialBatch.create.mockResolvedValue({
        id: "batch-1",
        batchNumber: "BATCH-001",
        productId: "product-1",
        quantity: 100,
        availableQty: 100,
        status: RawMaterialBatchStatus.ACTIVE,
      });
      mockTenantClient.warehouseStockBalance.findUnique.mockResolvedValue(null);
      mockTenantClient.warehouseStockBalance.upsert.mockResolvedValue({
        quantity: 100,
        availableQuantity: 100,
      });
      mockTenantClient.stockLedger.create.mockResolvedValue({
        id: "ledger-1",
        productId: "product-1",
        quantity: 100,
      });

      const result = await service.recordMovement(mockTenantClient, {
        productId: "product-1",
        warehouseId: "warehouse-1",
        quantity: 100,
        movementType: StockTransactionType.IN,
        referenceType: "PURCHASE",
        referenceId: "ref-1",
        userId: "user-1",
        batchNumber: "BATCH-001",
        expiryDate: new Date("2025-12-31"),
        receivedDate: new Date(),
      });

      expect(mockTenantClient.rawMaterialBatch.create).toHaveBeenCalled();
      expect(mockTenantClient.stockLedger.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should add to existing batch when batchId provided", async () => {
      const existingBatch = {
        id: "batch-1",
        batchNumber: "BATCH-001",
        quantity: 50,
        availableQty: 50,
        consumedQuantity: 0,
        receivedQuantity: 50,
        status: RawMaterialBatchStatus.ACTIVE,
      };

      mockTenantClient.product.findUnique.mockResolvedValue(mockProduct);
      mockTenantClient.rawMaterialBatch.findUnique.mockResolvedValue(existingBatch);
      mockTenantClient.rawMaterialBatch.update.mockResolvedValue({
        ...existingBatch,
        quantity: 150,
        availableQty: 150,
        receivedQuantity: 150,
      });
      mockTenantClient.warehouseStockBalance.findUnique.mockResolvedValue({
        quantity: 50,
      });
      mockTenantClient.warehouseStockBalance.upsert.mockResolvedValue({
        quantity: 150,
      });
      mockTenantClient.stockLedger.create.mockResolvedValue({
        id: "ledger-1",
        quantity: 100,
      });

      await service.recordMovement(mockTenantClient, {
        productId: "product-1",
        batchId: "batch-1",
        quantity: 100,
        movementType: StockTransactionType.IN,
        referenceType: "PURCHASE",
        referenceId: "ref-1",
        userId: "user-1",
      });

      expect(mockTenantClient.rawMaterialBatch.update).toHaveBeenCalledWith({
        where: { id: "batch-1" },
        data: expect.objectContaining({
          quantity: 150,
          availableQty: 150,
          receivedQuantity: 150,
        }),
      });
    });
  });

  describe("recordMovement - Stock Decrease (FIFO)", () => {
    it("should consume from oldest batch first (FIFO)", async () => {
      const oldBatch = {
        id: "batch-1",
        batchNumber: "BATCH-001",
        productId: "product-1",
        quantity: 100,
        availableQty: 100,
        consumedQuantity: 0,
        receivedDate: new Date("2025-01-01"),
        status: RawMaterialBatchStatus.ACTIVE,
        expiryDate: null,
        deletedAt: null,
      };

      const newBatch = {
        id: "batch-2",
        batchNumber: "BATCH-002",
        productId: "product-1",
        quantity: 200,
        availableQty: 200,
        consumedQuantity: 0,
        receivedDate: new Date("2025-01-15"),
        status: RawMaterialBatchStatus.ACTIVE,
        expiryDate: null,
        deletedAt: null,
      };

      mockTenantClient.product.findUnique.mockResolvedValue(mockProduct);
      mockStockSum(300);
      mockTenantClient.rawMaterialBatch.findMany.mockResolvedValue([oldBatch, newBatch]);
      mockTenantClient.rawMaterialBatch.update.mockResolvedValue({
        ...oldBatch,
        availableQty: 0,
        consumedQuantity: 100,
        status: RawMaterialBatchStatus.CONSUMED,
      });
      mockTenantClient.stockLedger.create.mockResolvedValue({
        id: "ledger-1",
        quantity: -100,
      });
      mockTenantClient.warehouseStockBalance.upsert.mockResolvedValue({
        quantity: 200,
      });

      await service.recordMovement(mockTenantClient, {
        productId: "product-1",
        warehouseId: "warehouse-1",
        quantity: -100,
        movementType: StockTransactionType.OUT,
        referenceType: "SALE",
        referenceId: "sale-1",
        userId: "user-1",
        useFIFO: true,
      });

      expect(mockTenantClient.rawMaterialBatch.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ rawMaterialId: "product-1" }),
          orderBy: [{ receivedDate: "asc" }],
        }),
      );
      expect(mockTenantClient.rawMaterialBatch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "batch-1" },
        }),
      );
    });

    it("should consume from multiple batches if needed", async () => {
      const batch1 = {
        id: "batch-1",
        batchNumber: "BATCH-001",
        productId: "product-1",
        quantity: 50,
        availableQty: 50,
        consumedQuantity: 0,
        receivedDate: new Date("2025-01-01"),
        status: RawMaterialBatchStatus.ACTIVE,
        expiryDate: null,
        deletedAt: null,
      };

      const batch2 = {
        id: "batch-2",
        batchNumber: "BATCH-002",
        productId: "product-1",
        quantity: 100,
        availableQty: 100,
        consumedQuantity: 0,
        receivedDate: new Date("2025-01-15"),
        status: RawMaterialBatchStatus.ACTIVE,
        expiryDate: null,
        deletedAt: null,
      };

      mockTenantClient.product.findUnique.mockResolvedValue(mockProduct);
      mockStockSum(150);
      mockTenantClient.rawMaterialBatch.findMany.mockResolvedValue([batch1, batch2]);
      mockTenantClient.rawMaterialBatch.update.mockResolvedValue({});
      mockTenantClient.stockLedger.create.mockResolvedValue({});
      mockTenantClient.stockLedger.createMany.mockResolvedValue({});
      mockTenantClient.warehouseStockBalance.upsert.mockResolvedValue({});

      await service.recordMovement(mockTenantClient, {
        productId: "product-1",
        warehouseId: "warehouse-1",
        quantity: -120,
        movementType: StockTransactionType.OUT,
        referenceType: "SALE",
        referenceId: "sale-1",
        userId: "user-1",
        useFIFO: true,
      });

      // Should update both batches
      expect(mockTenantClient.rawMaterialBatch.update).toHaveBeenCalledTimes(2);
    });

    it("should throw BadRequestException for insufficient stock", async () => {
      mockTenantClient.product.findUnique.mockResolvedValue(mockProduct);
      mockStockSum(50);

      await expect(
        service.recordMovement(mockTenantClient, {
          productId: "product-1",
          warehouseId: "warehouse-1",
          quantity: -100,
          movementType: StockTransactionType.OUT,
          referenceType: "SALE",
          referenceId: "sale-1",
          userId: "user-1",
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should block expired batches by default", async () => {
      const expiredBatch = {
        id: "batch-1",
        batchNumber: "BATCH-001",
        productId: "product-1",
        quantity: 100,
        availableQty: 100,
        receivedDate: new Date("2024-01-01"),
        expiryDate: new Date("2024-12-31"), // Expired
        status: RawMaterialBatchStatus.ACTIVE,
        deletedAt: null,
      };

      mockTenantClient.product.findUnique.mockResolvedValue(mockProduct);
      mockStockSum(100);
      mockTenantClient.rawMaterialBatch.findMany.mockResolvedValue([]); // No batches found (expired filtered out)

      await expect(
        service.recordMovement(mockTenantClient, {
          productId: "product-1",
          warehouseId: "warehouse-1",
          quantity: -50,
          movementType: StockTransactionType.OUT,
          referenceType: "SALE",
          referenceId: "sale-1",
          userId: "user-1",
          allowExpired: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should allow expired batches when allowExpired is true", async () => {
      const expiredBatch = {
        id: "batch-1",
        batchNumber: "BATCH-001",
        productId: "product-1",
        quantity: 100,
        availableQty: 100,
        consumedQuantity: 0,
        receivedDate: new Date("2024-01-01"),
        expiryDate: new Date("2024-12-31"),
        status: RawMaterialBatchStatus.ACTIVE,
        deletedAt: null,
      };

      mockTenantClient.product.findUnique.mockResolvedValue(mockProduct);
      mockStockSum(100);
      mockTenantClient.rawMaterialBatch.findMany.mockResolvedValue([expiredBatch]);
      mockTenantClient.rawMaterialBatch.update.mockResolvedValue({});
      mockTenantClient.stockLedger.create.mockResolvedValue({});
      mockTenantClient.warehouseStockBalance.upsert.mockResolvedValue({});

      await service.recordMovement(mockTenantClient, {
        productId: "product-1",
        warehouseId: "warehouse-1",
        quantity: -50,
        movementType: StockTransactionType.OUT,
        referenceType: "SALE",
        referenceId: "sale-1",
        userId: "user-1",
        allowExpired: true,
      });

      expect(mockTenantClient.rawMaterialBatch.findMany).toHaveBeenCalled();
      expect(mockTenantClient.rawMaterialBatch.update).toHaveBeenCalled();
    });

    it("should block BLOCKED batches", async () => {
      const blockedBatch = {
        id: "batch-1",
        batchNumber: "BATCH-001",
        productId: "product-1",
        quantity: 100,
        availableQty: 100,
        receivedDate: new Date("2025-01-01"),
        status: RawMaterialBatchStatus.BLOCKED,
        deletedAt: null,
      };

      mockTenantClient.product.findUnique.mockResolvedValue(mockProduct);
      mockStockSum(100);
      mockTenantClient.rawMaterialBatch.findMany.mockResolvedValue([]); // Blocked batches filtered out

      await expect(
        service.recordMovement(mockTenantClient, {
          productId: "product-1",
          warehouseId: "warehouse-1",
          quantity: -50,
          movementType: StockTransactionType.OUT,
          referenceType: "SALE",
          referenceId: "sale-1",
          userId: "user-1",
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("getCurrentBalance", () => {
    it("should return current stock balance for product", async () => {
      mockTenantClient.warehouseStockBalance.findFirst.mockResolvedValue({
        quantity: 150,
      });

      const balance = await service.getCurrentBalance(mockTenantClient, "product-1", "warehouse-1");

      expect(balance).toBe(150);
      expect(mockTenantClient.warehouseStockBalance.findFirst).toHaveBeenCalled();
    });

    it("should return 0 if no balance record exists", async () => {
      mockTenantClient.warehouseStockBalance.findFirst.mockResolvedValue(null);

      const balance = await service.getCurrentBalance(mockTenantClient, "product-1", "warehouse-1");

      expect(balance).toBe(0);
    });
  });

  describe("checkStockAvailability", () => {
    it("should return true if sufficient stock available", async () => {
      const validBatch = {
        id: "batch-1",
        expiryDate: new Date("2025-12-31"),
        availableQty: 100,
        status: RawMaterialBatchStatus.ACTIVE,
        deletedAt: null,
      };

      mockStockSum(100);
      mockTenantClient.rawMaterialBatch.findMany.mockResolvedValue([validBatch]);

      const available = await service.checkStockAvailability(
        mockTenantClient,
        "product-1",
        50,
        "warehouse-1",
      );

      expect(available).toBe(true);
      expect(mockTenantClient.warehouseStockBalance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            warehouseId: "warehouse-1",
            productId: "product-1",
          }),
        }),
      );
    });

    it("should return false if insufficient stock", async () => {
      const batch = {
        id: "batch-1",
        expiryDate: new Date("2025-12-31"),
        availableQty: 30,
        status: RawMaterialBatchStatus.ACTIVE,
        deletedAt: null,
      };

      mockStockSum(30);
      mockTenantClient.rawMaterialBatch.findMany.mockResolvedValue([batch]);

      const available = await service.checkStockAvailability(
        mockTenantClient,
        "product-1",
        50,
        "warehouse-1",
      );

      expect(available).toBe(false);
    });

    it("should exclude expired batches when allowExpired is false", async () => {
      const expiredBatch = {
        id: "batch-1",
        expiryDate: new Date("2024-12-31"),
        availableQty: 50,
        status: RawMaterialBatchStatus.ACTIVE,
        deletedAt: null,
      };

      const validBatch = {
        id: "batch-2",
        expiryDate: new Date("2025-12-31"),
        availableQty: 30,
        status: RawMaterialBatchStatus.ACTIVE,
        deletedAt: null,
      };

      mockTenantClient.rawMaterialBatch.findMany.mockResolvedValue([validBatch]);

      const available = await service.checkStockAvailability(
        mockTenantClient,
        "product-1",
        50,
        "warehouse-1",
        undefined, // zoneId
        false, // allowExpired = false
      );

      // Should only consider valid batch (30 < 50)
      expect(available).toBe(false);
    });
  });

  describe("recordMovements", () => {
    it("should record multiple movements in a single transaction", async () => {
      const batch = {
        id: "batch-1",
        batchNumber: "BATCH-001",
        productId: "product-1",
        quantity: 200,
        availableQty: 200,
        consumedQuantity: 0,
        receivedDate: new Date(),
        status: RawMaterialBatchStatus.ACTIVE,
        expiryDate: null,
        deletedAt: null,
      };

      mockTenantClient.product.findUnique.mockResolvedValue(mockProduct);
      mockTenantClient.warehouseStockBalance.findUnique.mockResolvedValue({
        quantity: 200,
      });
      mockTenantClient.warehouseStockBalance.findFirst.mockResolvedValue({
        quantity: 200,
      });
      mockStockSum(200);
      mockTenantClient.rawMaterialBatch.findMany.mockResolvedValue([batch]);
      mockTenantClient.rawMaterialBatch.findUnique.mockResolvedValue(batch);
      mockTenantClient.rawMaterialBatch.update.mockResolvedValue({});
      mockTenantClient.stockLedger.create.mockResolvedValue({});
      mockTenantClient.warehouseStockBalance.upsert.mockResolvedValue({});

      const movements = [
        {
          productId: "product-1",
          warehouseId: "warehouse-1",
          quantity: 100,
          movementType: StockTransactionType.IN,
          referenceType: "PURCHASE",
          referenceId: "po-1",
        },
        {
          productId: "product-1",
          warehouseId: "warehouse-1",
          quantity: -50,
          movementType: StockTransactionType.OUT,
          referenceType: "SALE",
          referenceId: "sale-1",
        },
      ];

      await service.recordMovements(mockTenantClient, movements, "user-1");

      expect(mockTenantClient.$transaction).toHaveBeenCalled();
      expect(mockTenantClient.stockLedger.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("markExpiredBatches", () => {
    it("should mark expired batches as EXPIRED", async () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      mockTenantClient.rawMaterialBatch.updateMany.mockResolvedValue({
        count: 5,
      });

      const result = await service.markExpiredBatches(mockTenantClient);

      expect(mockTenantClient.rawMaterialBatch.updateMany).toHaveBeenCalledWith({
        where: {
          status: RawMaterialBatchStatus.ACTIVE,
          expiryDate: {
            lte: expect.any(Date),
            not: null,
          },
          availableQty: { gt: 0 },
        },
        data: {
          status: RawMaterialBatchStatus.EXPIRED,
        },
      });
      expect(result).toBe(5);
    });
  });
});
