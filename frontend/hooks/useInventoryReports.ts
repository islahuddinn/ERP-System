import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface InventoryValuation {
  valuationData: Array<{
    productId: string
    product: {
      id: string
      name: string
      sku: string
    }
    locationId: string
    location: {
      id: string
      name: string
    }
    quantity: number
    unitCost: number
    totalValue: number
    valuationMethod: 'FIFO' | 'MOVING_AVG'
  }>
  totalStockValue: number
  totalItems: number
  valuationMethod: 'FIFO' | 'MOVING_AVG'
}

export interface StockAging {
  agingData: Array<{
    batchId: string
    batchNumber: string
    productId: string
    product: {
      id: string
      name: string
    }
    quantity: number
    receivedDate: string
    ageInDays: number
    ageCategory: 'NEW' | 'MATURE' | 'AGING' | 'OLD'
    expiryDate: string | null
    daysToExpiry: number | null
  }>
  summary: {
    new: number
    mature: number
    aging: number
    old: number
  }
}

export interface StockSnapshot {
  snapshotDate: string
  products: Array<{
    productId: string
    product: {
      id: string
      name: string
      sku: string
    }
    openingQty: number
    closingQty: number
    transactions: Array<{
      date: string
      type: string
      quantity: number
      referenceType: string
      referenceId: string
    }>
  }>
  totalProducts: number
  totalStockValue: number
}

export function useInventoryValuation(method: 'FIFO' | 'MOVING_AVG' = 'MOVING_AVG') {
  return useQuery<InventoryValuation>({
    queryKey: ['inventory-reports', 'valuation', method],
    queryFn: async () => {
      const response = await apiClient.get('/inventory-reports/valuation', { params: { method } })
      return response.data
    },
  })
}

export function useStockAging() {
  return useQuery<StockAging>({
    queryKey: ['inventory-reports', 'aging'],
    queryFn: async () => {
      const response = await apiClient.get('/inventory-reports/aging')
      return response.data
    },
  })
}

export function useStockSnapshot(date?: string) {
  return useQuery<StockSnapshot>({
    queryKey: ['inventory-reports', 'snapshot', date],
    queryFn: async () => {
      const params = date ? { date } : {}
      const response = await apiClient.get('/inventory-reports/snapshot', { params })
      return response.data
    },
  })
}

