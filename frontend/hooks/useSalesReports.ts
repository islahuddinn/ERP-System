import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface SalesReport {
  totalSales: number
  transactionCount: number
  totalQuantity: number
  averageTransactionValue: number
  period?: {
    startDate: string
    endDate: string
  }
}

export interface HourlySalesReport {
  hour: number
  totalSales: number
  transactionCount: number
  quantity: number
  averageTransactionValue: number
}

export interface SalesByProduct {
  productId: string
  product: {
    id: string
    name: string
    sku: string
  }
  totalSales: number
  totalQuantity: number
  transactionCount: number
  averagePrice: number
}

export interface SalesByLocation {
  locationId: string
  location: {
    id: string
    name: string
  } | null
  totalSales: number
  transactionCount: number
}

export interface SalesByPlant {
  plantId: string
  plant: {
    id: string
    name: string
    code: string
  }
  totalSales: number
  transactionCount: number
}

export function useDailySalesReport(date?: string, locationId?: string, plantId?: string) {
  const targetDate = date || new Date().toISOString().split('T')[0]
  return useQuery<SalesReport>({
    queryKey: ['sales-reports', 'daily', targetDate, locationId, plantId],
    queryFn: async () => {
      const params: any = { date: targetDate }
      if (locationId) params.locationId = locationId
      if (plantId) params.plantId = plantId
      const response = await apiClient.get('/sales-reports/daily', { params })
      return response.data
    },
  })
}

export function useMonthlySalesReport(year?: number, month?: number, locationId?: string, plantId?: string) {
  const currentDate = new Date()
  const targetYear = year || currentDate.getFullYear()
  const targetMonth = month || currentDate.getMonth() + 1
  return useQuery<SalesReport>({
    queryKey: ['sales-reports', 'monthly', targetYear, targetMonth, locationId, plantId],
    queryFn: async () => {
      const params: any = { year: targetYear, month: targetMonth }
      if (locationId) params.locationId = locationId
      if (plantId) params.plantId = plantId
      const response = await apiClient.get('/sales-reports/monthly', { params })
      return response.data
    },
  })
}

export function useHourlySalesReport(date?: string, locationId?: string) {
  const targetDate = date || new Date().toISOString().split('T')[0]
  return useQuery<HourlySalesReport[]>({
    queryKey: ['sales-reports', 'hourly', targetDate, locationId],
    queryFn: async () => {
      const params: any = { date: targetDate }
      if (locationId) params.locationId = locationId
      const response = await apiClient.get('/sales-reports/hourly', { params })
      return response.data
    },
  })
}

export function useSalesByProduct(startDate?: string, endDate?: string, productId?: string, locationId?: string, plantId?: string) {
  return useQuery<SalesByProduct[]>({
    queryKey: ['sales-reports', 'product', startDate, endDate, productId, locationId, plantId],
    queryFn: async () => {
      const params: any = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (productId) params.productId = productId
      if (locationId) params.locationId = locationId
      if (plantId) params.plantId = plantId
      const response = await apiClient.get('/sales-reports/product', { params })
      return response.data
    },
  })
}

export function useSalesByLocation(startDate?: string, endDate?: string, locationId?: string) {
  return useQuery<SalesByLocation[]>({
    queryKey: ['sales-reports', 'location', startDate, endDate, locationId],
    queryFn: async () => {
      const params: any = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (locationId) params.locationId = locationId
      const response = await apiClient.get('/sales-reports/location', { params })
      return response.data
    },
  })
}

export function useSalesByPlant(startDate?: string, endDate?: string, plantId?: string) {
  return useQuery<SalesByPlant[]>({
    queryKey: ['sales-reports', 'plant', startDate, endDate, plantId],
    queryFn: async () => {
      const params: any = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (plantId) params.plantId = plantId
      const response = await apiClient.get('/sales-reports/plant', { params })
      return response.data
    },
  })
}

