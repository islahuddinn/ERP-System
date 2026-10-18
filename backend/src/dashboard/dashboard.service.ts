import { Injectable, Logger } from "@nestjs/common";
import { CacheService } from "../common/services/cache.service";
import { DashboardRepository } from "./dashboard.repository";
import {
  DashboardMetrics,
  FactoryDashboardMetrics,
  PurchaseDashboardStats,
} from "./utils/interfaces";
import { ProductsRepository } from "../product-management/products/products.repository";
import { ProductDashboardStats } from "../product-management/products/utils/interfaces";
import { RawMaterialsRepository } from "../raw-materials/raw-materials.repository";
import { RawMaterialDashboardStats } from "../raw-materials/utils/interfaces";
import { PurchaseOrderRepository } from "../purchase-orders/purchase-order.repository";
import { SuppliersRepository } from "../suppliers/suppliers.repository";
import { ProductionOrdersRepository } from "../production-orders/production-orders.repository";
import { ProductionOrderDashboardStats } from "../production-orders/utils/interfaces";
import { BomRepository } from "../bom/bom.repository";
import { BomDashboardStats } from "../bom/utils/interfaces";
import { GrnRepository } from "../grn/grn.repository";
import { GrnDashboardStats } from "../grn/utils/interfaces";
import { SupplierTransactionsRepository } from "../suppliers/supplier-transactions.repository";
import { TopSupplierBySpend } from "../suppliers/utils/interfaces";
import { CustomerRepository } from "../customer-management/customers/customers.repository";
import { CustomerDashboardStats } from "../customer-management/customers/utils/interfaces";

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private readonly dashboardRepository: DashboardRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly rawMaterialsRepository: RawMaterialsRepository,
    private readonly purchaseOrderRepository: PurchaseOrderRepository,
    private readonly suppliersRepository: SuppliersRepository,
    private readonly productionOrdersRepository: ProductionOrdersRepository,
    private readonly bomRepository: BomRepository,
    private readonly grnRepository: GrnRepository,
    private readonly supplierTransactionsRepository: SupplierTransactionsRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly cacheService: CacheService,
  ) {}

  //–––––––––––––––––––––––––––––––– NEW ––––––––––––––––––––––––––––––––

  async getProductDashboard(): Promise<ProductDashboardStats> {
    return this.productsRepository.getDashboardStats();
  }

  async getRawMaterialDashboard(): Promise<RawMaterialDashboardStats> {
    return this.rawMaterialsRepository.getDashboardStats();
  }

  async getPurchaseOrderDashboard(): Promise<PurchaseDashboardStats> {
    const [purchaseOrderStats, supplierStats] = await Promise.all([
      this.purchaseOrderRepository.getDashboardStats(),
      this.suppliersRepository.getDashboardStats(),
    ]);

    return { ...purchaseOrderStats, ...supplierStats };
  }

  async getProductionOrderDashboard(): Promise<ProductionOrderDashboardStats> {
    return this.productionOrdersRepository.getDashboardStats();
  }

  async getBomDashboard(): Promise<BomDashboardStats> {
    return this.bomRepository.getDashboardStats();
  }

  async getGrnDashboard(): Promise<GrnDashboardStats> {
    return this.grnRepository.getDashboardStats();
  }

  async getSupplierSpendDashboard(): Promise<TopSupplierBySpend[]> {
    return this.supplierTransactionsRepository.getTopSuppliersBySpend();
  }

  async getCustomerDashboard(): Promise<CustomerDashboardStats> {
    return this.customerRepository.getDashboardStats();
  }

  //–––––––––––––––––––––––––––––––– OLD ––––––––––––––––––––––––––––––––

  async getDashboardMetrics(tenantId: string): Promise<DashboardMetrics> {
    const cacheKey = this.cacheService.generateKey("dashboard", tenantId);
    const cached = await this.cacheService.get<DashboardMetrics>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const [
        totalRevenue,
        purchaseCost,
        productionCost,
        wasteCost,
        totalProducts,
        totalStockQuantity,
        totalStockValue,
        pendingPurchases,
        completedPurchases,
        totalSuppliers,
        lowStockAlerts,
      ] = await Promise.all([
        this.dashboardRepository.getTotalRevenue().catch(() => 0),
        this.dashboardRepository.getPurchaseCost().catch(() => 0),
        this.dashboardRepository.getProductionCost().catch(() => 0),
        this.dashboardRepository.getWasteCost().catch(() => 0),
        this.dashboardRepository.getTotalActiveProducts().catch(() => 0),
        this.dashboardRepository.getTotalStockQuantity().catch(() => 0),
        this.getTotalStockValue().catch(() => 0),
        this.dashboardRepository.getPendingPurchaseCount().catch(() => 0),
        this.dashboardRepository.getCompletedPurchaseCount().catch(() => 0),
        this.dashboardRepository.getActiveSupplierCount().catch(() => 0),
        this.getLowStockAlertCount().catch(() => 0),
      ]);

      const totalCost = purchaseCost + productionCost + wasteCost;
      const netProfit = totalRevenue - totalCost;

      const result: DashboardMetrics = {
        totalRevenue,
        totalCost,
        netProfit,
        profitMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
        totalProducts,
        totalStockQuantity,
        totalStockValue,
        pendingPurchases,
        completedPurchases,
        totalSuppliers,
        lowStockAlerts,
      };

      await this.cacheService.set(cacheKey, result, 300);
      return result;
    } catch (error) {
      this.logger.error("Error fetching dashboard metrics", error);
      return this.getDefaultDashboardMetrics();
    }
  }

  async getFactoryDashboardMetrics(siteId?: string): Promise<FactoryDashboardMetrics> {
    const [productionCounts, totalWaste, inspectionCounts] = await Promise.all([
      this.dashboardRepository.getProductionOrderCounts(siteId),
      this.dashboardRepository.getTotalWasteQuantity(),
      this.dashboardRepository.getQualityInspectionCounts(siteId),
    ]);

    return {
      totalProductionOrders: productionCounts.total,
      inProgressOrders: productionCounts.inProgress,
      completedOrders: productionCounts.completed,
      totalProductionQuantity: productionCounts.totalProducedQuantity,
      totalWaste,
      totalQualityInspections: inspectionCounts.total,
      passedInspections: inspectionCounts.passed,
      failedInspections: inspectionCounts.failed,
      qualityPassRate:
        inspectionCounts.total > 0 ? (inspectionCounts.passed / inspectionCounts.total) * 100 : 0,
    };
  }

  private async getTotalStockValue(): Promise<number> {
    const stockLedgers = await this.dashboardRepository.getStockValuationLedger();

    return stockLedgers.reduce((total, ledger) => {
      const costPrice = Number(ledger.product.sellingPrice || 0);
      const quantity = Number(ledger.closingQty || 0);
      return total + costPrice * quantity;
    }, 0);
  }

  private async getLowStockAlertCount(): Promise<number> {
    const products = await this.dashboardRepository.getActiveProductsWithStock();

    return products.filter((product) => {
      const totalStock = (product.stockBalances || []).reduce(
        (sum, balance) => sum + Number(balance.quantity || 0),
        0,
      );
      const minStock = Number(product.minStock || 0);
      return totalStock <= minStock && totalStock > 0;
    }).length;
  }

  private getDefaultDashboardMetrics(): DashboardMetrics {
    return {
      totalRevenue: 0,
      totalCost: 0,
      netProfit: 0,
      profitMargin: 0,
      totalProducts: 0,
      totalStockQuantity: 0,
      totalStockValue: 0,
      pendingPurchases: 0,
      completedPurchases: 0,
      totalSuppliers: 0,
      lowStockAlerts: 0,
    };
  }
}
