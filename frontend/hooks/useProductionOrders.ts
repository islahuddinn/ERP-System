// React Query hooks for Production Orders — aligned to docs/api/production-orders-api.md
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

// ─── Types ──────────────────────────────────────────────────────────────────

export type ProductionOrderStatus = 'DRAFT' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
export type ProductionCostType = 'LABOUR' | 'OVERHEAD' | 'UTILITY' | 'OTHER'

export interface ProductionOrderBatchAllocation {
  id: string
  rawMaterialBatchId: string
  allocatedQuantity: number
  unitCost: number
  totalCost: string
  consumedAt: string | null
  rawMaterialBatch?: { id: string; batchNumber?: string; unitCost?: number }
}

export interface ProductionOrderMaterial {
  id: string
  rawMaterialId: string
  uomId: string
  requiredQuantity: number
  consumedQuantity: number
  estimatedCost: string
  actualCost: string | null
  rawMaterial?: { id: string; name: string; code: string }
  uom?: { id: string; name: string; symbol: string }
  batchAllocations?: ProductionOrderBatchAllocation[]
}

export interface ProductionOrderCost {
  id: string
  costType: ProductionCostType
  description?: string
  amount: string
  createdAt: string
}

export interface ProductionOrderWaste {
  id: string
  rawMaterialId: string
  uomId: string
  quantity: number
  unitCost: number
  totalCost: string
  notes?: string
  createdAt: string
  rawMaterial?: { id: string; name: string; code: string }
  uom?: { id: string; name: string; symbol: string }
}

export interface ProductionOrder {
  id: string
  orderNumber: string
  productId: string
  bomId: string
  siteId?: string | null
  plannedQuantity: number
  producedQuantity: number
  status: ProductionOrderStatus
  startedAt: string | null
  completedAt: string | null
  rawMaterialCost: string
  additionalCost: string
  wasteInputCost: string
  totalCost: string
  costPerUnit: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  product?: { id: string; name: string; code: string }
  bom?: { id: string; bomNumber: string; name: string }
  site?: { id: string; name: string; code: string } | null
  materials?: ProductionOrderMaterial[]
  costs?: ProductionOrderCost[]
  wastes?: ProductionOrderWaste[]
}

export interface ProductionOrdersMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ProductionOrderFilters {
  page?: number
  limit?: number
  search?: string
  status?: ProductionOrderStatus
  productId?: string
  siteId?: string
  startDate?: string
  endDate?: string
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface CreateProductionOrderDto {
  productId: string
  bomId: string
  siteId?: string
  plannedQuantity: number
  notes?: string
}

export interface UpdateProductionOrderDto {
  siteId?: string
  notes?: string
}

export interface AddProductionCostDto {
  costType: ProductionCostType
  description?: string
  amount: number
}

export interface AddProductionWasteDto {
  wasteManagementId: string
  quantity: number
  unitCost: number
  totalCost: number
  notes?: string
}

// ─── Queries ────────────────────────────────────────────────────────────────

export function useProductionOrders(filters: ProductionOrderFilters = {}) {
  return useQuery({
    queryKey: ['production-orders', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
      })
      const { data: response } = await apiClient.get(`/production-orders?${params.toString()}`)
      const data = (response?.data ?? []) as ProductionOrder[]
      const meta = (response?.meta ?? undefined) as ProductionOrdersMeta | undefined
      return { data: Array.isArray(data) ? data : [], meta }
    },
  })
}

export function useProductionOrder(id: string) {
  return useQuery({
    queryKey: ['production-order', id],
    enabled: !!id,
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/production-orders/${id}`)
      return (response?.data ?? response) as ProductionOrder
    },
  })
}

/** Active BOM for a product — populates the BOM field on the create screen. */
export function useActiveBom(productId?: string) {
  return useQuery({
    queryKey: ['bom', 'active', productId],
    enabled: !!productId,
    retry: false,
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/bom/product/${productId}/active`)
      return (response?.data ?? response) as { id: string; bomNumber?: string; name?: string } | null
    },
  })
}

// ─── Mutations ──────────────────────────────────────────────────────────────

function useInvalidate() {
  const qc = useQueryClient()
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: ['production-orders'] })
    if (id) qc.invalidateQueries({ queryKey: ['production-order', id] })
  }
}

export function useCreateProductionOrder() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (dto: CreateProductionOrderDto) => {
      const { data: response } = await apiClient.post('/production-orders', dto)
      return (response?.data ?? response) as ProductionOrder
    },
    onSuccess: () => invalidate(),
  })
}

export function useUpdateProductionOrder() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProductionOrderDto }) => {
      const { data: response } = await apiClient.patch(`/production-orders/${id}`, data)
      return (response?.data ?? response) as ProductionOrder
    },
    onSuccess: (_res, vars) => invalidate(vars.id),
  })
}

export function useConfirmProductionOrder() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: response } = await apiClient.patch(`/production-orders/${id}/status`, { action: 'CONFIRM' })
      return (response?.data ?? response) as ProductionOrder
    },
    onSuccess: (_res, id) => invalidate(id),
  })
}

export function useCompleteProductionOrder() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, producedQuantity, siteId }: { id: string; producedQuantity: number; siteId?: string }) => {
      const { data: response } = await apiClient.patch(`/production-orders/${id}/status`, {
        action: 'COMPLETE',
        producedQuantity,
        ...(siteId ? { siteId } : {}),
      })
      return (response?.data ?? response) as ProductionOrder
    },
    onSuccess: (_res, vars) => invalidate(vars.id),
  })
}

export function useCancelProductionOrder() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: response } = await apiClient.patch(`/production-orders/${id}/status`, { action: 'CANCEL' })
      return (response?.data ?? response) as ProductionOrder
    },
    onSuccess: (_res, id) => invalidate(id),
  })
}

export function useAddProductionCost() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AddProductionCostDto }) => {
      const { data: response } = await apiClient.post(`/production-orders/${id}/costs`, data)
      return (response?.data ?? response) as ProductionOrder
    },
    onSuccess: (_res, vars) => invalidate(vars.id),
  })
}

export function useAddProductionWaste() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AddProductionWasteDto }) => {
      const { data: response } = await apiClient.post(`/production-orders/${id}/wastes`, data)
      return (response?.data ?? response) as ProductionOrder
    },
    onSuccess: (_res, vars) => invalidate(vars.id),
  })
}
