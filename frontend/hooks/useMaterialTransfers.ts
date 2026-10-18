import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { isDummyDataEnabled } from '@/lib/dummy-data'
import {
  getDummyMaterialTransfers,
  getMaterialTransferById,
  createDummyMaterialTransfer,
  updateDummyMaterialTransferStatus,
  getDummyMaterialTransfersStore,
  type MaterialTransfer,
  type MaterialTransferStatus,
  type MaterialTransferItem
} from '@/data/dummy/factory/material-transfers'

// Use dummy data when backend is not available
const getUseDummyData = () => isDummyDataEnabled()

export interface MaterialTransferFilters {
  page?: number
  limit?: number
  search?: string
  status?: MaterialTransferStatus
  fromWarehouseId?: string
  toWarehouseId?: string
  productId?: string
  dateFrom?: string
  dateTo?: string
}

export function useMaterialTransfers(filters?: MaterialTransferFilters) {
  return useQuery({
    queryKey: ['material-transfers', filters],
    queryFn: async () => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 300))
        return getDummyMaterialTransfers(filters)
      }

      const response = await apiClient.get('/material-transfers', { params: filters })
      // Backend ResponseInterceptor wraps: { success, message, data: { transfers, total } }
      const root = response.data
      const payload = root?.data ?? root

      // If payload is { transfers: [...], total: ... }, normalize to { data: [...], meta: {...} }
      if (payload && Array.isArray(payload.transfers)) {
        const page = filters?.page ? parseInt(String(filters.page)) : 1
        const limit = filters?.limit ? parseInt(String(filters.limit)) : 20
        const total = payload.total || 0
        return {
          data: payload.transfers,
          meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        }
      }

      // If payload is already normalized or is an array, return as-is
      if (Array.isArray(payload)) {
        return {
          data: payload,
          meta: {
            total: payload.length,
            page: 1,
            limit: payload.length,
            totalPages: 1,
          },
        }
      }

      // Fallback
      return {
        data: [],
        meta: {
          total: 0,
          page: 1,
          limit: 20,
          totalPages: 0,
        },
      }
    },
  })
}

export function useMaterialTransfer(id: string) {
  return useQuery({
    queryKey: ['material-transfer', id],
    queryFn: async () => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 200))
        const transfer = getMaterialTransferById(id)
        if (!transfer) throw new Error('Material transfer not found')
        return transfer
      }

      const response = await apiClient.get(`/material-transfers/${id}`)
      // Backend ResponseInterceptor wraps: { success, message, data: {...} }
      const root = response.data
      return root?.data ?? root
    },
    enabled: !!id,
  })
}

export interface CreateMaterialTransferDto {
  transferNumber?: string
  title: string
  description: string
  transferType: 'WAREHOUSE_TO_WAREHOUSE' | 'WAREHOUSE_TO_PLANT' | 'PLANT_TO_WAREHOUSE' | 'PLANT_TO_PLANT' | 'DEPARTMENT_TO_DEPARTMENT'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  scheduledDate: string
  expectedDeliveryDate?: string
  sourceLocationType: 'WAREHOUSE' | 'PLANT' | 'DEPARTMENT'
  sourceLocationId: string
  sourceLocationDetails?: string
  destinationLocationType: 'WAREHOUSE' | 'PLANT' | 'DEPARTMENT'
  destinationLocationId: string
  destinationLocationDetails?: string
  notes?: string
  // Additional properties used in the codebase
  fromWarehouseId?: string
  toWarehouseId?: string
  fromZoneId?: string
  toZoneId?: string
  transferDate?: string
  items: Array<{
    materialId: string
    productId?: string
    quantity: number
    unit?: string
    batchId?: string
    specifications?: string
    notes?: string
  }>
}

export function useCreateMaterialTransfer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateMaterialTransferDto) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500))

        // Get warehouses from dummy data
        const { dummyWarehouses } = await import('@/data/dummy/factory/warehouses')
        const fromWarehouse = dummyWarehouses.find(w => w.id === data.fromWarehouseId)
        const toWarehouse = dummyWarehouses.find(w => w.id === data.toWarehouseId)

        if (!fromWarehouse || !toWarehouse) {
          throw new Error('Warehouse not found')
        }

        // Get products for items
        const { dummyProducts } = await import('@/data/dummy/factory/material-requests')

        const items = data.items.map(item => {
          const product = dummyProducts.find(p => p.id === item.productId)
          return {
            id: `item-${Date.now()}-${Math.random()}`,
            productId: item.productId,
            product: product ? {
              id: product.id,
              name: product.name,
              code: product.code,
              unit: product.unit,
            } : { id: item.productId, name: 'Unknown Product', code: 'UNK', unit: item.unit },
            quantity: item.quantity,
            unit: item.unit,
            batchId: item.batchId,
            notes: item.notes,
          }
        })

        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)

        const newTransfer = createDummyMaterialTransfer({
          fromWarehouseId: data.fromWarehouseId || fromWarehouse.id,
          fromWarehouse: {
            id: fromWarehouse.id,
            name: fromWarehouse.name,
            code: fromWarehouse.code,
          },
          fromZoneId: data.fromZoneId,
          toWarehouseId: data.toWarehouseId || toWarehouse.id,
          toWarehouse: {
            id: toWarehouse.id,
            name: toWarehouse.name,
            code: toWarehouse.code,
          },
          toZoneId: data.toZoneId,
          transferDate: data.transferDate || new Date().toISOString(),
          expectedDeliveryDate: data.expectedDeliveryDate,
          status: 'PENDING',
          items,
          itemsCount: items.length,
          totalQuantity,
          notes: data.notes,
          createdById: 'user-1',
          receivedById: undefined,
        })

        queryClient.setQueryData(['material-transfers'], (old: any) => {
          if (!old) return { data: [newTransfer], meta: { total: 1, page: 1, limit: 20, totalPages: 1 } }
          return {
            ...old,
            data: [newTransfer, ...old.data],
            meta: { ...old.meta, total: old.meta.total + 1 },
          }
        })

        return newTransfer
      }

      const response = await apiClient.post('/material-transfers', data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-transfers'] })
    },
  })
}

export interface ReceiveMaterialTransferDto {
  receivingComments?: string
  items: Array<{
    id: string
    actualQuantity?: number
    damagedQuantity?: number
    receivingNotes?: string
  }>
}

export function useApproveMaterialTransfer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, comments }: { id: string; comments?: string }) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const updated = updateDummyMaterialTransferStatus(id, 'APPROVED')
        if (!updated) throw new Error('Material transfer not found')

        queryClient.setQueryData(['material-transfer', id], updated)
        queryClient.invalidateQueries({ queryKey: ['material-transfers'] })

        return updated
      }

      const response = await apiClient.patch(`/material-transfers/${id}/approve`, { comments: comments || '' })
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['material-transfers'] })
      queryClient.invalidateQueries({ queryKey: ['material-transfer', variables.id] })
    },
  })
}

export function useStartMaterialTransfer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, transportDetails }: { id: string; transportDetails?: string }) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const updated = updateDummyMaterialTransferStatus(id, 'IN_TRANSIT')
        if (!updated) throw new Error('Material transfer not found')

        queryClient.setQueryData(['material-transfer', id], updated)
        queryClient.invalidateQueries({ queryKey: ['material-transfers'] })

        return updated
      }

      const response = await apiClient.patch(`/material-transfers/${id}/start`, { transportDetails: transportDetails || '' })
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['material-transfers'] })
      queryClient.invalidateQueries({ queryKey: ['material-transfer', variables.id] })
    },
  })
}

export function useReceiveMaterialTransfer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ReceiveMaterialTransferDto }) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const updated = updateDummyMaterialTransferStatus(id, 'RECEIVED')
        if (!updated) throw new Error('Material transfer not found')

        queryClient.setQueryData(['material-transfer', id], updated)
        queryClient.invalidateQueries({ queryKey: ['material-transfers'] })

        return updated
      }

      const response = await apiClient.patch(`/material-transfers/${id}/receive`, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['material-transfers'] })
      queryClient.invalidateQueries({ queryKey: ['material-transfer', variables.id] })
    },
  })
}


export function useCancelMaterialTransfer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, comments }: { id: string; comments?: string }) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        const updated = updateDummyMaterialTransferStatus(id, 'CANCELLED')
        if (!updated) throw new Error('Material transfer not found')

        queryClient.setQueryData(['material-transfer', id], updated)
        queryClient.invalidateQueries({ queryKey: ['material-transfers'] })

        return updated
      }

      const response = await apiClient.patch(`/material-transfers/${id}/cancel`, { comments: comments || '' })
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['material-transfers'] })
      queryClient.invalidateQueries({ queryKey: ['material-transfer', variables.id] })
    },
  })
}

export function useDeleteMaterialTransfer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (getUseDummyData()) {
        await new Promise(resolve => setTimeout(resolve, 500))
        return { id }
      }

      const response = await apiClient.delete(`/material-transfers/${id}`)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-transfers'] })
    },
  })
}

export type { MaterialTransfer, MaterialTransferStatus, MaterialTransferItem }

