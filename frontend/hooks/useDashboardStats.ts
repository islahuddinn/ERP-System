import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

/**
 * Per-domain dashboard stats (backend: docs/api/dashboard-api.md).
 *
 * Each endpoint backs one card/chart on the dashboard and is cheap enough to be
 * fetched in parallel — never chain these. Every hook is independent so a single
 * failing domain degrades that one card instead of blanking the whole page.
 */

// ─────────────────────────────── Response shapes ───────────────────────────────

export interface ProductDashboardStats {
  totalActiveProducts: number
  totalStockValue: number
  lowStockCount: number
  outOfStockCount: number
}

export interface RawMaterialDashboardStats {
  totalRawMaterials: number
  totalStockValue: number
  lowStockCount: number
  outOfStockCount: number
  expiringBatchesCount: number
}

/** Purchase-order breakdown merged with supplier counts (backend returns them together). */
export interface PurchaseDashboardStats {
  totalPurchaseOrders: number
  draftPurchaseOrders: number
  confirmedPurchaseOrders: number
  partialPurchaseOrders: number
  receivedPurchaseOrders: number
  cancelledPurchaseOrders: number
  pendingApprovalCount: number
  totalPurchaseValue: number
  totalOutstandingAmount: number
  totalSuppliers: number
  activeSuppliers: number
  inactiveSuppliers: number
}

export interface ProductionOrderDashboardStats {
  totalProductionOrders: number
  draftProductionOrders: number
  inProgressProductionOrders: number
  completedProductionOrders: number
  cancelledProductionOrders: number
  totalProductionCost: number
  totalWasteCost: number
}

export interface BomDashboardStats {
  totalBoms: number
  draftBoms: number
  activeBoms: number
  inactiveBoms: number
}

export interface GrnDashboardStats {
  totalGrns: number
  pendingGrns: number
  inspectingGrns: number
  approvedGrns: number
  rejectedGrns: number
  completedGrns: number
  totalReceivedQuantity: number
  totalRejectedQuantity: number
}

export interface TopSupplierBySpend {
  supplierId: string
  supplierName: string
  totalSpend: number
}

export interface TopCustomerByBalance {
  customerId: string
  customerName: string
  balance: number
}

export interface CustomerDashboardStats {
  totalCustomers: number
  activeCustomers: number
  inactiveCustomers: number
  topCustomersByBalance: TopCustomerByBalance[]
}

// ──────────────────────────────────── Hooks ────────────────────────────────────

// Dashboard numbers should be current when the user lands, but re-fetching on
// every re-render is wasteful — refresh on mount, then treat as fresh for a minute.
const DASHBOARD_QUERY_OPTIONS = {
  staleTime: 60 * 1000,
  refetchOnMount: 'always',
} as const

function useDashboardStat<T>(key: string, path: string) {
  return useQuery<T>({
    queryKey: ['dashboard', 'stats', key],
    queryFn: async () => {
      const response = await apiClient.get(path)
      // The API wraps payloads as { success, message, data } — unwrap, but stay
      // tolerant of a bare body so the hook works either way.
      const body = response.data
      return body && typeof body === 'object' && 'data' in body && 'success' in body
        ? (body.data as T)
        : (body as T)
    },
    ...DASHBOARD_QUERY_OPTIONS,
  })
}

export function useProductStats() {
  return useDashboardStat<ProductDashboardStats>('products', '/dashboard/products/stats')
}

export function useRawMaterialStats() {
  return useDashboardStat<RawMaterialDashboardStats>('raw-materials', '/dashboard/raw-materials/stats')
}

export function usePurchaseOrderStats() {
  return useDashboardStat<PurchaseDashboardStats>('purchase-orders', '/dashboard/purchase-orders/stats')
}

export function useProductionOrderStats() {
  return useDashboardStat<ProductionOrderDashboardStats>(
    'production-orders',
    '/dashboard/production-orders/stats',
  )
}

export function useBomStats() {
  return useDashboardStat<BomDashboardStats>('bom', '/dashboard/bom/stats')
}

export function useGrnStats() {
  return useDashboardStat<GrnDashboardStats>('grn', '/dashboard/grn/stats')
}

/** Top 5 suppliers by spend — already sorted and capped by the backend. */
export function useTopSuppliersBySpend() {
  return useDashboardStat<TopSupplierBySpend[]>('suppliers-spend', '/dashboard/suppliers/spend-stats')
}

export function useCustomerStats() {
  return useDashboardStat<CustomerDashboardStats>('customers', '/dashboard/customers/stats')
}
