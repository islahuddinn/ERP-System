import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

export interface StockMovement {
  id: string
  date: string
  product: {
    id: string
    name: string
    sku: string
  }
  quantity: number
  transactionType: string
  referenceType: string
  referenceId: string
  warehouse?: {
    id: string
    name: string
  } | null
  zone?: {
    id: string
    name: string
  } | null
  batch?: {
    id: string
    batchNumber: string
  } | null
  remarks?: string
}

export interface StockTransfer {
  referenceId: string
  referenceType: string
  date: string
  product: {
    id: string
    name: string
    sku: string
  }
  quantity: number
  fromWarehouse: {
    id: string
    name: string
  } | null
  toWarehouse: {
    id: string
    name: string
  } | null
  batch?: {
    id: string
    batchNumber: string
  } | null
}

export interface StockAdjustment extends StockMovement {
  openingQty: number
  closingQty: number
  createdById: string
}

export interface WasteMovement {
  id: string
  date: string
  product: {
    id: string
    name: string
    sku: string
  }
  quantity: number
  wasteType: string
  reason: string
  cost: number
  warehouse?: {
    id: string
    name: string
  } | null
  zone?: {
    id: string
    name: string
  } | null
  batch?: {
    id: string
    batchNumber: string
  } | null
  remarks?: string
}

export function useInboundMovements(startDate?: string, endDate?: string, productId?: string) {
  return useQuery<StockMovement[]>({
    queryKey: ['stock-movement-reports', 'inbound', startDate, endDate, productId],
    queryFn: async () => {
      const params: any = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (productId) params.productId = productId
      const response = await apiClient.get('/stock-movement-reports/inbound', { params })
      return response.data
    },
  })
}

export function useOutboundMovements(startDate?: string, endDate?: string, productId?: string) {
  return useQuery<StockMovement[]>({
    queryKey: ['stock-movement-reports', 'outbound', startDate, endDate, productId],
    queryFn: async () => {
      const params: any = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (productId) params.productId = productId
      const response = await apiClient.get('/stock-movement-reports/outbound', { params })
      return response.data
    },
  })
}

export function useStockTransfers(startDate?: string, endDate?: string) {
  return useQuery<StockTransfer[]>({
    queryKey: ['stock-movement-reports', 'transfers', startDate, endDate],
    queryFn: async () => {
      const params: any = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      const response = await apiClient.get('/stock-movement-reports/transfers', { params })
      return response.data
    },
  })
}

export function useStockAdjustments(startDate?: string, endDate?: string, productId?: string) {
  return useQuery<StockAdjustment[]>({
    queryKey: ['stock-movement-reports', 'adjustments', startDate, endDate, productId],
    queryFn: async () => {
      const params: any = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (productId) params.productId = productId
      const response = await apiClient.get('/stock-movement-reports/adjustments', { params })
      return response.data
    },
  })
}

export function useWasteMovements(startDate?: string, endDate?: string, productId?: string) {
  return useQuery<WasteMovement[]>({
    queryKey: ['stock-movement-reports', 'waste', startDate, endDate, productId],
    queryFn: async () => {
      const params: any = {}
      if (startDate) params.startDate = startDate
      if (endDate) params.endDate = endDate
      if (productId) params.productId = productId
      const response = await apiClient.get('/stock-movement-reports/waste', { params })
      return response.data
    },
  })
}

