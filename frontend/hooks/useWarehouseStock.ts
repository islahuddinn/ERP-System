import { useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import {
  dummyWarehouseStockBalances,
  dummyWarehouseStockTransactions,
  getStockByWarehouse,
  getStockByZone,
  getStockByProduct,
  getTransactionsByWarehouse,
  getTransactionsByZone,
} from '@/data/dummy/factory/warehouse-stock'
import { getDummyDataStore } from './useWarehouses'
import { isDummyDataEnabled } from '@/lib/dummy-data'

const getUseDummyData = () => isDummyDataEnabled()

export interface WarehouseStockBalance {
  id: string
  warehouseId: string
  zoneId?: string
  productId: string
  batchId?: string
  quantity: number
  reservedQuantity: number
  availableQuantity: number
  lastUpdated: string
  warehouse?: {
    id: string
    name: string
    code: string
  }
  zone?: {
    id: string
    name: string
    code: string
  }
  product?: {
    id: string
    name: string
    sku: string
    price: number
    category: string
  }
  batch?: {
    id: string
    batchNumber: string
    expiryDate: string
  }
}

export interface WarehouseStockTransaction {
  id: string
  warehouseId: string
  zoneId?: string
  productId: string
  batchId?: string
  transactionType: 'IN' | 'OUT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT'
  quantity: number
  referenceType?: string
  referenceId?: string
  notes?: string
  createdAt: string
  createdById?: string
  warehouse?: {
    id: string
    name: string
    code: string
  }
  zone?: {
    id: string
    name: string
    code: string
  }
  product?: {
    id: string
    name: string
    sku: string
  }
  batch?: {
    id: string
    batchNumber: string
  }
}

export interface WarehouseStockFilters {
  warehouseId?: string
  zoneId?: string
  productId?: string
  batchId?: string
  search?: string
  page?: number
  limit?: number
}

export interface WarehouseStockSummary {
  totalProducts: number
  totalQuantity: number
  totalValue: number
  totalReserved: number
  totalAvailable: number
  lowStockItems: number
  warehouses: Array<{
    warehouseId: string
    warehouseName: string
    productCount: number
    totalQuantity: number
    totalValue: number
  }>
  zones: Array<{
    zoneId: string
    zoneName: string
    warehouseName: string
    productCount: number
    totalQuantity: number
    totalValue: number
  }>
}

// Hook to get all warehouse stock balances
export function useWarehouseStock(filters?: WarehouseStockFilters) {
  return useQuery({
    queryKey: ['warehouse-stock', filters],
    queryFn: async () => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 300))

        let balances = [...dummyWarehouseStockBalances]

        // Apply filters
        if (filters?.warehouseId) {
          balances = balances.filter(b => b.warehouseId === filters.warehouseId)
        }
        if (filters?.zoneId) {
          balances = balances.filter(b => b.zoneId === filters.zoneId)
        }
        if (filters?.productId) {
          balances = balances.filter(b => b.productId === filters.productId)
        }
        if (filters?.batchId) {
          balances = balances.filter(b => b.batchId === filters.batchId)
        }
        if (filters?.search) {
          const searchLower = filters.search.toLowerCase()
          balances = balances.filter(b =>
            b.product?.name.toLowerCase().includes(searchLower) ||
            b.product?.sku.toLowerCase().includes(searchLower) ||
            b.warehouse?.name.toLowerCase().includes(searchLower) ||
            b.zone?.name.toLowerCase().includes(searchLower)
          )
        }

        // Pagination
        const page = filters?.page || 1
        const limit = filters?.limit || 50
        const start = (page - 1) * limit
        const end = start + limit
        const paginatedBalances = balances.slice(start, end)

        return {
          data: paginatedBalances,
          meta: {
            total: balances.length,
            page,
            limit,
            totalPages: Math.ceil(balances.length / limit),
          },
        }
      }

      const params = new URLSearchParams()
      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.warehouseId) params.append('warehouseId', filters.warehouseId)
      if (filters?.zoneId) params.append('zoneId', filters.zoneId)
      if (filters?.productId) params.append('productId', filters.productId)
      if (filters?.search) params.append('search', filters.search)

      const response = await apiClient.get(`/warehouses/stock/balances?${params.toString()}`)
      const responseData = response.data


      // Handle wrapped response: { success, message, data: { data: [...], meta: {...} } } or direct { data: [...], meta: {...} }
      if (
        responseData &&
        typeof responseData === 'object' &&
        'data' in responseData &&
        !Array.isArray(responseData.data) &&
        'data' in responseData.data &&
        Array.isArray(responseData.data.data)
      ) {
        // Triple-nested: { success: true, data: { data: [...], meta: {...} } }
        return responseData.data
      }

      if (
        responseData &&
        typeof responseData === 'object' &&
        'data' in responseData &&
        Array.isArray(responseData.data)
      ) {
        // Double-nested: { data: [...], meta: {...} }
        return responseData
      }

      // Fallback: assume direct response
      return responseData
    },
  })
}

// Hook to get warehouse stock summary
export function useWarehouseStockSummary() {
  return useQuery({
    queryKey: ['warehouse-stock-summary'],
    queryFn: async () => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 200))

        const balances = dummyWarehouseStockBalances
        const uniqueProducts = new Set(balances.map(b => b.productId))
        const totalQuantity = balances.reduce((sum, b) => sum + b.quantity, 0)
        const totalValue = balances.reduce((sum, b) => sum + (b.quantity * (b.product?.price || 0)), 0)
        const totalReserved = balances.reduce((sum, b) => sum + b.reservedQuantity, 0)
        const totalAvailable = balances.reduce((sum, b) => sum + b.availableQuantity, 0)

        // Calculate warehouse-wise summary
        const warehouseMap = new Map<string, {
          warehouseId: string
          warehouseName: string
          productCount: number
          totalQuantity: number
          totalValue: number
        }>()

        balances.forEach(balance => {
          if (!balance.warehouse) return

          const existing = warehouseMap.get(balance.warehouseId) || {
            warehouseId: balance.warehouseId,
            warehouseName: balance.warehouse.name,
            productCount: 0,
            totalQuantity: 0,
            totalValue: 0,
          }

          existing.productCount++
          existing.totalQuantity += balance.quantity
          existing.totalValue += balance.quantity * (balance.product?.price || 0)

          warehouseMap.set(balance.warehouseId, existing)
        })

        // Calculate zone-wise summary
        const zoneMap = new Map<string, {
          zoneId: string
          zoneName: string
          warehouseName: string
          productCount: number
          totalQuantity: number
          totalValue: number
        }>()

        balances.forEach(balance => {
          if (!balance.zone || !balance.warehouse) return

          const key = `${balance.zoneId}-${balance.warehouseId}`
          const existing = zoneMap.get(key) || {
            zoneId: balance.zoneId,
            zoneName: balance.zone.name,
            warehouseName: balance.warehouse.name,
            productCount: 0,
            totalQuantity: 0,
            totalValue: 0,
          }

          existing.productCount++
          existing.totalQuantity += balance.quantity
          existing.totalValue += balance.quantity * (balance.product?.price || 0)

          zoneMap.set(key, { ...existing, zoneId: existing.zoneId || '' })
        })

        // Low stock items (assuming reorder level of 50)
        const lowStockItems = balances.filter(b => b.availableQuantity < 50).length

        return {
          totalProducts: uniqueProducts.size,
          totalQuantity,
          totalValue,
          totalReserved,
          totalAvailable,
          lowStockItems,
          warehouses: Array.from(warehouseMap.values()),
          zones: Array.from(zoneMap.values()),
        }
      }

      const response = await apiClient.get('/warehouses/stock/summary')
      const responseData = response.data

      // Handle wrapped response: { success, message, data: {...} } or direct object
      if (
        responseData &&
        typeof responseData === 'object' &&
        'data' in responseData &&
        !Array.isArray(responseData.data)
      ) {
        return responseData.data
      }

      return responseData
    },
  })
}

// Hook to get stock by warehouse
export function useStockByWarehouse(warehouseId?: string) {
  return useQuery({
    queryKey: ['warehouse-stock-by-warehouse', warehouseId],
    queryFn: async () => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 200))
        return getStockByWarehouse(warehouseId)
      }

      const response = await apiClient.get(`/warehouses/${warehouseId}/stock`)
      return response.data
    },
    enabled: !!warehouseId,
  })
}

// Hook to get stock by zone
export function useStockByZone(zoneId?: string) {
  return useQuery({
    queryKey: ['warehouse-stock-by-zone', zoneId],
    queryFn: async () => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 200))
        return getStockByZone(zoneId)
      }

      const response = await apiClient.get(`/warehouses/zones/${zoneId}/stock`)
      return response.data
    },
    enabled: !!zoneId,
  })
}

// Hook to get warehouse stock transactions
export function useWarehouseStockTransactions(filters?: {
  warehouseId?: string
  zoneId?: string
  productId?: string
  transactionType?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: ['warehouse-stock-transactions', filters],
    queryFn: async () => {

      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 300))

        let transactions = [...dummyWarehouseStockTransactions]

        // Apply filters
        if (filters?.warehouseId) {
          transactions = transactions.filter(t => t.warehouseId === filters.warehouseId)
        }
        if (filters?.zoneId) {
          transactions = transactions.filter(t => t.zoneId === filters.zoneId)
        }
        if (filters?.productId) {
          transactions = transactions.filter(t => t.productId === filters.productId)
        }
        if (filters?.transactionType) {
          transactions = transactions.filter(t => t.transactionType === filters.transactionType)
        }
        if (filters?.startDate) {
          const start = new Date(filters.startDate)
          transactions = transactions.filter(t => new Date(t.createdAt) >= start)
        }
        if (filters?.endDate) {
          const end = new Date(filters.endDate)
          transactions = transactions.filter(t => new Date(t.createdAt) <= end)
        }

        // Pagination
        const page = filters?.page || 1
        const limit = filters?.limit || 50
        const start = (page - 1) * limit
        const end = start + limit
        const paginatedTransactions = transactions.slice(start, end)

        const result = {
          data: paginatedTransactions,
          meta: {
            total: transactions.length,
            page,
            limit,
            totalPages: Math.ceil(transactions.length / limit),
          },
        }


        return result
      }

      const params = new URLSearchParams()
      if (filters?.page) params.append('page', filters.page.toString())
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.warehouseId) params.append('warehouseId', filters.warehouseId)
      if (filters?.zoneId) params.append('zoneId', filters.zoneId)
      if (filters?.productId) params.append('productId', filters.productId)
      if (filters?.transactionType) params.append('transactionType', filters.transactionType)
      if (filters?.startDate) params.append('startDate', filters.startDate)
      if (filters?.endDate) params.append('endDate', filters.endDate)

      const url = `/warehouses/stock/transactions?${params.toString()}`
      

      try {
        const response = await apiClient.get(url)
        
        
        // Handle response structure - API returns { success, message, data: { data: [...], meta: {...} } }
        // We need to unwrap it to return { data: [...], meta: {...} }
        let result = response.data
        if (result?.success && result?.data) {
          // Unwrap the success wrapper: { success, message, data: { data: [...], meta: {...} } }
          result = result.data  // Now result = { data: [...], meta: {...} }
        } else if (result?.data && Array.isArray(result.data)) {
          // Already in correct format: { data: [...], meta: {...} }
          result = result
        }


        return result
      } catch (error: any) {
        throw error
      }
    },
  })
}

// Hook to get capacity alerts (reuse from useWarehouses)
export function useWarehouseCapacityAlerts(warehouseId?: string) {
  return useQuery({
    queryKey: ['warehouse-capacity-alerts', warehouseId],
    queryFn: async () => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 200))

        const store = getDummyDataStore()
        if (warehouseId) {
          return store.alerts.get(warehouseId) || []
        }

        // Get all alerts
        const allAlerts: any[] = []
        store.alerts.forEach((alerts) => {
          allAlerts.push(...alerts)
        })
        return allAlerts.filter(a => !a.isResolved)
      }

      if (warehouseId) {
        const response = await apiClient.get(`/warehouses/${warehouseId}/alerts`)
        return response.data
      }

      const response = await apiClient.get('/warehouses/alerts')
      return response.data
    },
  })
}

