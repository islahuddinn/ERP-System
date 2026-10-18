import { PurchaseOrderDashboardStats } from "../../purchase-orders/utils/interfaces";
import { SupplierDashboardStats } from "../../suppliers/utils/interfaces";

export interface DashboardMetrics {
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  profitMargin: number;
  totalProducts: number;
  totalStockQuantity: number;
  totalStockValue: number;
  pendingPurchases: number;
  completedPurchases: number;
  totalSuppliers: number;
  lowStockAlerts: number;
}

export interface FactoryDashboardMetrics {
  totalProductionOrders: number;
  inProgressOrders: number;
  completedOrders: number;
  totalProductionQuantity: number;
  totalWaste: number;
  totalQualityInspections: number;
  passedInspections: number;
  failedInspections: number;
  qualityPassRate: number;
}

export interface ProductionOrderCounts {
  total: number;
  inProgress: number;
  completed: number;
  totalProducedQuantity: number;
}

export interface QualityInspectionCounts {
  total: number;
  passed: number;
  failed: number;
}

export type PurchaseDashboardStats = PurchaseOrderDashboardStats & SupplierDashboardStats;
