// React Query hooks for Product Batches — aligned to backend/src/product-management/product-batches/*
// Product batches are CREATED automatically when a production order completes.
// This module is read/list + a few stage/status actions; there is no manual create.
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { apiClient } from '@/lib/api-client'

// ─── Types ──────────────────────────────────────────────────────────────────

export type ProductBatchStatus =
  | 'ACTIVE'
  | 'PARTIAL'
  | 'CONSUMED'
  | 'EXPIRED'
  | 'BLOCKED'
  | 'QUARANTINE'

export type ProductBatchStageStatus = 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export interface ProductBatchStage {
  id: string
  productBatchId: string
  stageName: string
  siteId: string | null
  status: ProductBatchStageStatus
  receivedQuantity: number
  approvedQuantity: number | null
  rejectedQuantity: number | null
  additionalCost: string | null
  costPerUnit: string | null
  notes: string | null
  createdById: string | null
  createdAt: string
  startedAt: string
  completedAt: string | null
}

export interface ProductBatch {
  id: string
  batchNumber: string
  productId: string
  siteId: string | null
  productionOrderId: string
  currentStage: string
  isFinal: boolean
  quantity: number
  consumedQuantity: number
  reservedQuantity: number
  returnedQuantity: number
  availableQuantity: number
  costPerUnit: string
  retailPrice: string | null
  salePrice: string | null
  manufacturingDate: string | null
  expiryDate: string | null
  status: ProductBatchStatus
  notes: string | null
  createdById: string | null
  updatedById: string | null
  createdAt: string
  updatedAt: string
  product?: { id: string; name: string; code: string }
  site?: { id: string; name: string; code: string } | null
  productionOrder?: { id: string; orderNumber: string }
  stages?: ProductBatchStage[]
}

export interface ProductBatchesMeta {
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ProductBatchFilters {
  page?: number
  limit?: number
  search?: string
  status?: ProductBatchStatus
  currentStage?: string
  productId?: string
  siteId?: string
  isFinal?: boolean
  startDate?: string
  endDate?: string
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface ProductBatchStockSummary {
  stage: string
  isFinal: boolean
  quantity: number
  batchCount: number
}

export interface StartProductBatchStageDto {
  stageName: string
  siteId?: string
}

export interface CompleteProductBatchStageDto {
  approvedQuantity: number
  rejectedQuantity?: number
  additionalCost?: number
  isFinal?: boolean
  manufacturingDate?: string
  expiryDate?: string
  retailPrice?: number
  salePrice?: number
  notes?: string
}

export interface UpdateProductBatchDto {
  costPerUnit?: number
  retailPrice?: number
  salePrice?: number
  notes?: string
  status?: ProductBatchStatus
}

/**
 * Finalize a batch — push its available quantity into sellable Product stock
 * and (optionally) set the selling price + expiry/manufacturing dates.
 *
 * NOTE: the backend `PATCH /finalize` route only persists manufacturingDate,
 * expiryDate and notes. retailPrice / salePrice are persisted by the separate
 * `PATCH /:id` update route, so the finalize mutation below sets the price via
 * that route first (when provided) and then finalizes — giving the user a
 * single "set price + push to stock" action.
 */
export interface FinalizeProductBatchDto {
  retailPrice?: number
  salePrice?: number
  manufacturingDate?: string
  expiryDate?: string
  notes?: string
}

// ─── Queries ────────────────────────────────────────────────────────────────

export function useProductBatches(filters: ProductBatchFilters = {}) {
  return useQuery({
    queryKey: ['product-batches', filters],
    queryFn: async () => {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') params.set(key, String(value))
      })
      const { data: response } = await apiClient.get(`/product-management/product-batches?${params.toString()}`)
      const data = (response?.data ?? []) as ProductBatch[]
      const meta = (response?.meta ?? undefined) as ProductBatchesMeta | undefined
      return { data: Array.isArray(data) ? data : [], meta }
    },
  })
}

export function useProductBatch(id: string) {
  return useQuery({
    queryKey: ['product-batch', id],
    enabled: !!id,
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/product-management/product-batches/${id}`)
      return (response?.data ?? response) as ProductBatch
    },
  })
}

/** Stage-wise stock breakdown for a product (units at each stage). */
export function useProductBatchStockSummary(productId?: string) {
  return useQuery({
    queryKey: ['product-batches', 'stock-summary', productId],
    enabled: !!productId,
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/product-management/product-batches/stock-summary/${productId}`)
      const data = (response?.data ?? response) as ProductBatchStockSummary[]
      return Array.isArray(data) ? data : []
    },
  })
}

/**
 * Distinct current-stage values across ALL product batches (not just the
 * on-screen page). Powers the "Current Stage" filter with static options so
 * selecting a stage doesn't collapse the dropdown to that single value.
 */
export function useProductBatchStages() {
  return useQuery({
    queryKey: ['product-batches', 'stages'],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/product-management/product-batches/stages')
      const data = (response?.data ?? response) as string[]
      return Array.isArray(data) ? data : []
    },
  })
}

// ─── Mutations ──────────────────────────────────────────────────────────────

function useInvalidate() {
  const qc = useQueryClient()
  return (id?: string) => {
    qc.invalidateQueries({ queryKey: ['product-batches'] })
    if (id) qc.invalidateQueries({ queryKey: ['product-batch', id] })
  }
}

/** Pull an API error message out of an axios/fetch error, with a fallback. */
function errorMessage(error: any, fallback: string): string {
  return error?.response?.data?.message || error?.message || fallback
}

export function useStartProductBatchStage() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: StartProductBatchStageDto }) => {
      const { data: response } = await apiClient.post(`/product-management/product-batches/${id}/stages/start`, data)
      return (response?.data ?? response) as ProductBatch
    },
    onSuccess: (_res, vars) => invalidate(vars.id),
  })
}

export function useCompleteProductBatchStage() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({
      id,
      stageId,
      data,
    }: {
      id: string
      stageId: string
      data: CompleteProductBatchStageDto
    }) => {
      const { data: response } = await apiClient.patch(
        `/product-management/product-batches/${id}/stages/${stageId}/complete`,
        data,
      )
      return (response?.data ?? response) as ProductBatch
    },
    onSuccess: (_res, vars) => invalidate(vars.id),
  })
}

export function useCancelProductBatchStage() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, stageId }: { id: string; stageId: string }) => {
      const { data: response } = await apiClient.patch(
        `/product-management/product-batches/${id}/stages/${stageId}/cancel`,
      )
      return (response?.data ?? response) as ProductBatch
    },
    onSuccess: (_res, vars) => invalidate(vars.id),
  })
}

export function useUpdateProductBatch() {
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateProductBatchDto }) => {
      const { data: response } = await apiClient.patch(`/product-management/product-batches/${id}`, data)
      return (response?.data ?? response) as ProductBatch
    },
    onSuccess: (_res, vars) => invalidate(vars.id),
  })
}

/**
 * Finalize a batch: set its selling price (retail / sale) and dates, then push
 * the approved quantity into the product's sellable stock. Until a batch is
 * finalized its units cannot be sold.
 *
 * The backend finalize route persists only manufacturingDate / expiryDate /
 * notes, so when a price is supplied we first PATCH the batch to store the
 * price, then call finalize — a single user action that prices and releases
 * the stock.
 */
export function useFinalizeProductBatch() {
  const qc = useQueryClient()
  const invalidate = useInvalidate()
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FinalizeProductBatchDto }) => {
      const { retailPrice, salePrice, manufacturingDate, expiryDate, notes } = data

      // 1) Persist the selling price via the update route (finalize ignores it).
      const priceUpdate: UpdateProductBatchDto = {}
      if (retailPrice !== undefined) priceUpdate.retailPrice = retailPrice
      if (salePrice !== undefined) priceUpdate.salePrice = salePrice
      if (Object.keys(priceUpdate).length > 0) {
        await apiClient.patch(`/product-management/product-batches/${id}`, priceUpdate)
      }

      // 2) Finalize — push approved quantity into sellable stock.
      const finalizeBody: Record<string, unknown> = {}
      if (manufacturingDate) finalizeBody.manufacturingDate = manufacturingDate
      if (expiryDate) finalizeBody.expiryDate = expiryDate
      if (notes) finalizeBody.notes = notes
      const { data: response } = await apiClient.patch(
        `/product-management/product-batches/${id}/finalize`,
        finalizeBody,
      )
      return (response?.data ?? response) as ProductBatch
    },
    onSuccess: (res, vars) => {
      invalidate(vars.id)
      // Stock summary for this product changes once stock is pushed.
      const productId = res?.productId
      if (productId) {
        qc.invalidateQueries({ queryKey: ['product-batches', 'stock-summary', productId] })
      }
      toast.success('Batch finalized — stock is now sellable')
    },
    onError: (error: any) => {
      toast.error(errorMessage(error, 'Failed to finalize batch'))
    },
  })
}
