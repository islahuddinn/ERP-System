import { Test, TestingModule } from "@nestjs/testing";
import { DashboardService } from "./dashboard.service";
import { DashboardRepository } from "./dashboard.repository";
import { CacheService } from "../common/services/cache.service";
import { ProductsRepository } from "../product-management/products/products.repository";
import { RawMaterialsRepository } from "../raw-materials/raw-materials.repository";
import { PurchaseOrderRepository } from "../purchase-orders/purchase-order.repository";
import { SuppliersRepository } from "../suppliers/suppliers.repository";
import { ProductionOrdersRepository } from "../production-orders/production-orders.repository";

describe("DashboardService", () => {
  let service: DashboardService;
  let cacheService: CacheService;
  let dashboardRepository: jest.Mocked<DashboardRepository>;
  let purchaseOrderRepository: jest.Mocked<PurchaseOrderRepository>;
  let suppliersRepository: jest.Mocked<SuppliersRepository>;
  const tenantId = "test-tenant-id";

  beforeEach(async () => {
    const mockDashboardRepository = {
      getTotalRevenue: jest.fn().mockResolvedValue(0),
      getPurchaseCost: jest.fn().mockResolvedValue(0),
      getProductionCost: jest.fn().mockResolvedValue(0),
      getWasteCost: jest.fn().mockResolvedValue(0),
      getTotalActiveProducts: jest.fn().mockResolvedValue(0),
      getTotalStockQuantity: jest.fn().mockResolvedValue(0),
      getStockValuationLedger: jest.fn().mockResolvedValue([]),
      getPendingPurchaseCount: jest.fn().mockResolvedValue(0),
      getCompletedPurchaseCount: jest.fn().mockResolvedValue(0),
      getActiveSupplierCount: jest.fn().mockResolvedValue(0),
      getActiveProductsWithStock: jest.fn().mockResolvedValue([]),
      getTotalWasteQuantity: jest.fn().mockResolvedValue(0),
      getProductionOrderCounts: jest.fn().mockResolvedValue({
        total: 0,
        inProgress: 0,
        completed: 0,
        totalProducedQuantity: 0,
      }),
      getQualityInspectionCounts: jest.fn().mockResolvedValue({ total: 0, passed: 0, failed: 0 }),
    };

    const mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      generateKey: jest.fn().mockReturnValue("cache-key"),
    };

    const mockProductsRepository = {
      getDashboardStats: jest.fn(),
    };

    const mockRawMaterialsRepository = {
      getDashboardStats: jest.fn(),
    };

    const mockPurchaseOrderRepository = {
      getDashboardStats: jest.fn(),
    };

    const mockSuppliersRepository = {
      getDashboardStats: jest.fn(),
    };

    const mockProductionOrdersRepository = {
      getDashboardStats: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: DashboardRepository, useValue: mockDashboardRepository },
        { provide: ProductsRepository, useValue: mockProductsRepository },
        { provide: RawMaterialsRepository, useValue: mockRawMaterialsRepository },
        { provide: PurchaseOrderRepository, useValue: mockPurchaseOrderRepository },
        { provide: SuppliersRepository, useValue: mockSuppliersRepository },
        { provide: ProductionOrdersRepository, useValue: mockProductionOrdersRepository },
        { provide: CacheService, useValue: mockCacheService },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
    cacheService = module.get<CacheService>(CacheService);
    dashboardRepository = module.get(DashboardRepository);
    purchaseOrderRepository = module.get(PurchaseOrderRepository);
    suppliersRepository = module.get(SuppliersRepository);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getDashboardMetrics", () => {
    it("should return complete dashboard metrics", async () => {
      (cacheService.get as jest.Mock).mockResolvedValue(null);

      dashboardRepository.getTotalRevenue.mockResolvedValue(10000);
      dashboardRepository.getPurchaseCost.mockResolvedValue(3000);
      dashboardRepository.getProductionCost.mockResolvedValue(1000);
      dashboardRepository.getTotalActiveProducts.mockResolvedValue(100);
      dashboardRepository.getTotalStockQuantity.mockResolvedValue(1000);
      dashboardRepository.getPendingPurchaseCount.mockResolvedValue(5);
      dashboardRepository.getActiveSupplierCount.mockResolvedValue(50);

      const result = await service.getDashboardMetrics(tenantId);

      expect(result).toHaveProperty("totalRevenue", 10000);
      expect(result).toHaveProperty("totalCost");
      expect(result).toHaveProperty("netProfit");
      expect(result).toHaveProperty("totalProducts", 100);
      expect(result).toHaveProperty("totalSuppliers", 50);
      expect(cacheService.set).toHaveBeenCalled();
    });

    it("should return cached metrics if available", async () => {
      const cachedData = { totalRevenue: 5000 };
      (cacheService.get as jest.Mock).mockResolvedValue(cachedData);

      const result = await service.getDashboardMetrics(tenantId);

      expect(result).toEqual(cachedData);
      expect(dashboardRepository.getTotalRevenue).not.toHaveBeenCalled();
    });
  });

  describe("getFactoryDashboardMetrics", () => {
    it("should return factory metrics", async () => {
      dashboardRepository.getProductionOrderCounts.mockResolvedValue({
        total: 10,
        inProgress: 2,
        completed: 8,
        totalProducedQuantity: 500,
      });
      dashboardRepository.getTotalWasteQuantity.mockResolvedValue(50);
      dashboardRepository.getQualityInspectionCounts.mockResolvedValue({
        total: 20,
        passed: 18,
        failed: 2,
      });

      const result = await service.getFactoryDashboardMetrics();

      expect(result).toHaveProperty("totalProductionOrders", 10);
      expect(result).toHaveProperty("totalProductionQuantity", 500);
      expect(result).toHaveProperty("totalWaste", 50);
      expect(result).toHaveProperty("totalQualityInspections", 20);
    });
  });

  describe("getPurchaseOrderDashboard", () => {
    it("should merge purchase order and supplier stats", async () => {
      purchaseOrderRepository.getDashboardStats.mockResolvedValue({
        totalPurchaseOrders: 10,
        draftPurchaseOrders: 2,
        confirmedPurchaseOrders: 3,
        partialPurchaseOrders: 1,
        receivedPurchaseOrders: 4,
        cancelledPurchaseOrders: 0,
        pendingApprovalCount: 1,
        totalPurchaseValue: 50000,
        totalOutstandingAmount: 8000,
      });
      suppliersRepository.getDashboardStats.mockResolvedValue({
        totalSuppliers: 20,
        activeSuppliers: 18,
        inactiveSuppliers: 2,
      });

      const result = await service.getPurchaseOrderDashboard();

      expect(result).toEqual({
        totalPurchaseOrders: 10,
        draftPurchaseOrders: 2,
        confirmedPurchaseOrders: 3,
        partialPurchaseOrders: 1,
        receivedPurchaseOrders: 4,
        cancelledPurchaseOrders: 0,
        pendingApprovalCount: 1,
        totalPurchaseValue: 50000,
        totalOutstandingAmount: 8000,
        totalSuppliers: 20,
        activeSuppliers: 18,
        inactiveSuppliers: 2,
      });
    });
  });
});
