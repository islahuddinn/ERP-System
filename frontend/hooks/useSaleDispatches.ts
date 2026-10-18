import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

// ─── Enums ────────────────────────────────────────────────────────────────────

export type SaleDispatchStatus = 'DRAFT' | 'APPROVED' | 'DELIVERED'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface DispatchSaleCustomer {
  id: string
  name: string
  phone?: string | null
  email?: string | null
}

export interface DispatchSale {
  id: string
  saleNumber: string
  status: string
  saleDate: string
  customer?: DispatchSaleCustomer | null
}

export interface DispatchSiteLocation {
  address?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
}

export interface DispatchSite {
  id: string
  name: string
  code?: string | null
  location?: DispatchSiteLocation | null
}

export interface DispatchUserRef {
  id: string
  firstName?: string
  lastName?: string
  /** Legacy single-name field — the API now returns firstName/lastName. */
  name?: string
  email?: string
}

// Grouped item shape — returned by GET /sale-dispatches/:saleDispatchId only.
export interface DispatchGroupedItemBatch {
  dispatchItemId: string
  productBatchId: string
  batchNumber: string
  quantity: number
}

export interface DispatchGroupedItem {
  saleItemId: string
  itemName: string
  sku?: string | null
  orderedQuantity: number
  dispatchedQuantity: number
  batches: DispatchGroupedItemBatch[]
}

// Flat item shape — returned by POST generate and PATCH.
export interface DispatchFlatItem {
  id: string
  dispatchId: string
  saleItemId: string
  productBatchId: string
  quantity: number
  createdAt: string
  saleItem?: {
    id: string
    itemName: string
    sku?: string | null
    quantity: number
    dispatchedQuantity: number
  }
  productBatch?: {
    id: string
    batchNumber: string
  }
}

// List-row shape (no items).
export interface SaleDispatchListItem {
  id: string
  dispatchNumber: string
  saleId: string
  siteId: string
  status: SaleDispatchStatus
  createdById?: string
  dispatchOfficerId?: string | null
  siteManagerId?: string | null
  approvedAt?: string | null
  deliveredAt?: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  sale?: DispatchSale | null
  site?: DispatchSite | null
}

// Full enriched detail shape (GET single).
export interface SaleDispatchDetail extends SaleDispatchListItem {
  items?: DispatchGroupedItem[]
  siteManager?: DispatchUserRef | null
  dispatchOfficer?: DispatchUserRef | null
  createdBy?: DispatchUserRef | null
}

export interface SaleDispatchQueryParams {
  search?: string
  saleId?: string
  siteId?: string
  status?: SaleDispatchStatus
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

// PATCH body — status transitions + DRAFT-only officer/notes edits.
export interface UpdateSaleDispatchDto {
  status?: SaleDispatchStatus
  dispatchOfficerId?: string
  notes?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildSearchParams = (params: Record<string, unknown>): string => {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  return searchParams.toString()
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

// List dispatches (paginated). page/limit are ALWAYS sent — the backend list
// endpoint rejects requests that omit them ("Invalid data provided").
export const useSaleDispatches = (params: SaleDispatchQueryParams = {}) => {
  const { page = 1, limit = 10, ...rest } = params
  return useQuery({
    queryKey: ['sale-dispatches', { page, limit, ...rest }],
    queryFn: async () => {
      const qs = buildSearchParams({ page, limit, ...rest } as Record<string, unknown>)
      const { data: response } = await apiClient.get(`/sale-dispatches?${qs}`)
      // Backend wraps as: { success, message, data: [...], meta: {...} }
      return {
        data: (response?.data ?? response ?? []) as SaleDispatchListItem[],
        meta: response?.meta ?? null,
      }
    },
    placeholderData: keepPreviousData,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })
}

// Get single dispatch (grouped/enriched detail).
export const useSaleDispatch = (saleDispatchId: string) => {
  return useQuery({
    queryKey: ['sale-dispatch', saleDispatchId],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/sale-dispatches/${saleDispatchId}`)
      return (response?.data ?? response) as SaleDispatchDetail
    },
    enabled: !!saleDispatchId,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })
}

// Generate dispatches from a CONFIRMED sale (one per site). Returns an array.
export const useGenerateSaleDispatches = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (saleId: string) => {
      const { data: response } = await apiClient.post(`/sale-dispatches/generate/${saleId}`)
      return (response?.data ?? response) as SaleDispatchListItem[]
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sale-dispatches'] })
    },
  })
}

// Update a dispatch — used for Approve / Reject / Mark Delivered / edit officer+notes.
export const useUpdateSaleDispatch = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      saleDispatchId,
      data,
    }: {
      saleDispatchId: string
      data: UpdateSaleDispatchDto
    }) => {
      const { data: response } = await apiClient.patch(`/sale-dispatches/${saleDispatchId}`, data)
      return (response?.data ?? response) as SaleDispatchDetail
    },
    onSuccess: async (_, { saleDispatchId }) => {
      await queryClient.invalidateQueries({ queryKey: ['sale-dispatches'] })
      await queryClient.invalidateQueries({ queryKey: ['sale-dispatch', saleDispatchId] })
    },
  })
}
