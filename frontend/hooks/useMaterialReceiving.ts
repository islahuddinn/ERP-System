import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import type { PaginationMeta } from '@/components/ui/pagination'
import { extractPaginatedDataFromResponse, unwrapResponse } from '@/lib/response-utils'

function normalizePaginationMeta(
  meta: Partial<PaginationMeta> | undefined | null,
): PaginationMeta | null {
  if (!meta) return null
  return {
    total: meta.total ?? 0,
    page: meta.page ?? 1,
    limit: meta.limit ?? 20,
    totalPages: meta.totalPages ?? 0,
    hasNext: meta.hasNext,
    hasPrev: meta.hasPrev,
  }
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type GrnStatus = 'PENDING' | 'INSPECTING' | 'APPROVED' | 'REJECTED' | 'COMPLETED'
export type GrnReceivingType = 'PURCHASE_ORDER' | 'RETURN' | 'PRODUCTION_RETURN' | 'OTHER'
export type BatchStatus = 'QUARANTINE' | 'ACTIVE' | 'PARTIAL' | 'CONSUMED' | 'EXPIRED' | 'BLOCKED'

export interface GrnBatch {
  id: string
  batchNumber?: string
  siteId: string
  site?: { id: string; name: string }
  /** Legacy/computed alias; backend exposes received/available/consumed instead. */
  quantity?: number
  receivedQuantity?: number
  availableQuantity?: number
  consumedQuantity?: number
  returnedQuantity?: number
  reservedQuantity?: number
  status: BatchStatus
  unitCost?: number
  manufacturingDate?: string
  expiryDate?: string
  notes?: string
}

export interface GrnItem {
  id: string
  rawMaterialId: string
  rawMaterial?: { id: string; name: string; code: string }
  uomId: string
  uom?: { id: string; name: string; symbol: string }
  expectedQuantity: number
  receivedQuantity: number
  specifications?: string
  receivingNotes?: string
  rawMaterialBatches?: GrnBatch[]
}

export interface Grn {
  id: string
  receivingNumber: string
  status: GrnStatus
  receivingType: GrnReceivingType
  receivedDate: string
  vehicleDetails?: string
  deliveryNoteNumber?: string
  purchaseOrderId: string
  notes?: string
  purchaseOrder?: {
    id: string
    orderNumber: string
    supplier?: { id: string; name: string }
  }
  items: GrnItem[]
  createdAt?: string
  updatedAt?: string
}

export interface GrnFilters {
  page?: number
  limit?: number
  search?: string
  status?: GrnStatus
  receivingType?: GrnReceivingType
  startDate?: string
  endDate?: string
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface GrnStats {
  total: number
  completed: number
  completionRate: number
}

export interface CreateGrnBatchDto {
  siteId: string
  quantity: number
  manufacturingDate?: string
  expiryDate?: string
  unitCost?: number
  notes?: string
}

export interface CreateGrnItemDto {
  rawMaterialId: string
  uomId: string
  expectedQuantity: number
  receivedQuantity: number
  specifications?: string
  receivingNotes?: string
  batches: CreateGrnBatchDto[]
}

export interface CreateGrnDto {
  receivingNumber?: string
  receivingType: GrnReceivingType
  receivedDate: string
  purchaseOrderId: string
  supplierId?: string
  notes?: string
  vehicleDetails?: string
  deliveryNoteNumber?: string
  items: CreateGrnItemDto[]
}

// ─── Hooks ───────────────────────────────────────────────────────────────────

export function useGrns(filters?: GrnFilters) {
  return useQuery({
    queryKey: ['grns', filters],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/grn', { params: filters })
      const paginated = extractPaginatedDataFromResponse<Grn>(response)
      return {
        data: paginated.data,
        meta: normalizePaginationMeta(paginated.meta),
      }
    },
    placeholderData: keepPreviousData,
  })
}

export function useGrn(id: string) {
  return useQuery({
    queryKey: ['grn', id],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/grn/${id}`)
      return unwrapResponse(response) as Grn
    },
    enabled: !!id,
  })
}

export function useCreateGrn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreateGrnDto) => {
      const { data: response } = await apiClient.post('/grn', data)
      return unwrapResponse(response)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['grns'] })
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      // Also refresh the single-PO detail (query key ['purchase', id] — see usePurchase
      // in usePurchases.ts). Broad-invalidating ['purchase'] covers the specific PO so
      // that after a GRN is created its detail page refetches: the "Create GRN" button
      // hides (its _count.grns updates) and received quantities update without a manual
      // page refresh (QA #23).
      queryClient.invalidateQueries({ queryKey: ['purchase'] })
    },
  })
}

export function useGrnStats() {
  return useQuery({
    queryKey: ['grn-stats'],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/grn/stats')
      return unwrapResponse(response) as GrnStats
    },
  })
}

// ─── Legacy aliases (used by existing pages) ─────────────────────────────────
// These thin wrappers keep existing import names working without breaking changes.

/** @deprecated Use useGrns instead */
export const useMaterialReceivings = useGrns

/** @deprecated Use useGrn instead */
export const useMaterialReceiving = useGrn

/** @deprecated Use useCreateGrn instead */
export const useCreateMaterialReceiving = useCreateGrn

// Legacy type aliases
export type ReceivingStatus = GrnStatus
export type { Grn as MaterialReceiving }
