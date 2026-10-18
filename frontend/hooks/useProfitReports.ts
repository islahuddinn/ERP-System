import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface ProfitReport {
  revenue: number
  cost: number
  netProfit: number
  profitMargin: number
  period?: {
    startDate: string
    endDate: string
  }
}

export interface ProfitByProduct {
  productId: string
  product: {
    id: string
    name: string
    sku: string
  }
  revenue: number
  cost: number
  profit: number
  profitMargin: number
  quantity: number
}

export interface ProfitByPlant {
  plantId: string
  plant: {
    id: string
    name: string
    code: string
  }
  revenue: number
  cost: number
  profit: number
  profitMargin: number
  productionQuantity: number
}

export interface FactoryProfit {
  plantId: string
  totalRevenue: number
  totalCost: number
  netProfit: number
  profitMargin: number
  totalQuantity: number
}

export function useProfit(startDate?: string, endDate?: string) {
  return useQuery<ProfitReport>({
    queryKey: ['profit', startDate, endDate],
    queryFn: async () => {
      const params: any = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const response = await apiClient.get('/costing/profitability', { params: { ...params, period: 'custom' } })
      return response.data
    },
  })
}

export function useDailyProfit(date?: string) {
  const targetDate = date || new Date().toISOString().split('T')[0]
  return useQuery<ProfitReport>({
    queryKey: ['profit', 'daily', targetDate],
    queryFn: async () => {
      const params: any = {}
      const response = await apiClient.get('/costing/profit/daily', { params: { ...params, period: 'custom', startDate: targetDate, endDate: targetDate } })
      return response.data
    },
  })
}

export function useMonthlyProfit(year?: number, month?: number) {
  const currentDate = new Date()
  const targetYear = year || currentDate.getFullYear()
  const targetMonth = month || currentDate.getMonth() + 1
  return useQuery<ProfitReport>({
    queryKey: ['profit', 'monthly', targetYear, targetMonth],
    queryFn: async () => {
      const params: any = {}
      const response = await apiClient.get('/costing/profit/monthly', {
        params: { ...params, period: 'custom', startDate: new Date(targetYear, targetMonth - 1, 1).toISOString(), endDate: new Date(targetYear, targetMonth, 0).toISOString() },
      })
      return response.data
    },
  })
}

export function useProfitByProduct(startDate?: string, endDate?: string, productId?: string) {
  return useQuery<ProfitByProduct[]>({
    queryKey: ['profit', 'product', startDate, endDate, productId],
    queryFn: async () => {
      const params: any = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (productId) params.productId = productId
      const response = await apiClient.get('/costing/profit/product', { params: { ...params, period: 'custom' } })
      return response.data
    },
  })
}

export function useProfitByPlant(startDate?: string, endDate?: string, plantId?: string) {
  return useQuery<ProfitByPlant[]>({
    queryKey: ['profit', 'plant', startDate, endDate, plantId],
    queryFn: async () => {
      const params: any = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (plantId) params.plantId = plantId
      const response = await apiClient.get('/costing/profit/plant', { params: { ...params, period: 'custom' } })
      return response.data
    },
  })
}

export function useFactoryProfit(plantId: string, startDate?: string, endDate?: string) {
  return useQuery<FactoryProfit>({
    queryKey: ['profit', 'factory', plantId, startDate, endDate],
    queryFn: async () => {
      const params: any = { plantId }
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const response = await apiClient.get('/costing/profit/factory', { params })
      return response.data
    },
    enabled: !!plantId,
  })
}

