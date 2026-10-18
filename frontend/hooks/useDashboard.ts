import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface DashboardMetrics {
  totalRevenue: number
  totalCost: number
  netProfit: number
  profitMargin: number
  totalProducts: number
  totalStockQuantity: number
  totalStockValue: number
  pendingPurchases: number
  completedPurchases: number
  totalSuppliers: number
  lowStockAlerts: number
}

export interface FactoryDashboardMetrics {
  totalProductionOrders: number
  inProgressOrders: number
  completedOrders: number
  totalProductionQuantity: number
  totalWaste: number
  totalQualityInspections: number
  passedInspections: number
  failedInspections: number
  qualityPassRate: number
}

export function useDashboard() {
  return useQuery<DashboardMetrics>({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await apiClient.get('/dashboard')
      const body = response.data
      return (body?.data ?? body) as DashboardMetrics
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// The backend filters this endpoint by `siteId` — sending `plantId` (the old name)
// was silently ignored, so the site filter never actually applied.
export function useFactoryDashboard(siteId?: string) {
  return useQuery<FactoryDashboardMetrics>({
    queryKey: ['dashboard', 'factory', siteId],
    queryFn: async () => {
      const params = siteId ? { siteId } : {}
      const response = await apiClient.get('/dashboard/factory', { params })
      // Unwrap the { success, message, data } envelope (apiClient doesn't).
      return (response.data?.data ?? response.data) as FactoryDashboardMetrics
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

