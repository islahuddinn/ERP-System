import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

// ─────────────────────────────────────────────────────────────────────────────
// Sale Returns hooks
//
// IMPORTANT — endpoint reality (verified against the live backend + docs/api/sales-api.md):
//   • The ONLY sale-return endpoint the backend exposes is:
//       POST /sales/:saleId/returns   → create a return for a COMPLETED sale
//   • There is NO `GET /sale-returns`, `GET /sale-returns/:id`, or
//     `GET /sales/:saleId/returns`. The `/sale-returns` route 404s; the
//     `@Auditable({ module: SALE_RETURNS })` decorator lives on the create route
//     inside SalesController, so "sale-returns" is an audit module, not a REST
//     resource.
//   • Returns are embedded in the Sale entity as `sale.returns[]` (each with
//     `returnItems[]`). The Sale list (`GET /sales`) and detail (`GET /sales/:id`)
//     return the sale with its `returns` populated.
//
// Therefore:
//   • LIST  of returns  → fetch sales (`GET /sales`) and flatten each sale's
//                         `returns[]` into return rows (with sale + customer
//                         context attached). Pagination here is page-local
//                         (we paginate the flattened returns of the fetched sales
//                         page); meta is derived so the shared <Pagination> still
//                         works against the underlying sales page count.
//   • DETAIL of a return → fetch the parent sale (`GET /sales/:saleId`) and pick
//                          the matching return out of `sale.returns[]`.
//   • CREATE             → POST /sales/:saleId/returns
//
// The backend ResponseInterceptor wraps every response as
//   { success, message, data, meta }
// so we always unwrap `response.data` (and `response.meta` for lists).
// ─────────────────────────────────────────────────────────────────────────────

export type SaleReturnStatus = 'PROCESSED'
export type RefundStatus = 'PENDING' | 'PROCESSED' | 'FAILED'
export type PaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'MOBILE_PAYMENT'
  | 'BANK_TRANSFER'
  | 'CHEQUE'
  | 'OTHER'
  | 'CREDIT'
export type SaleStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface SaleReturnItem {
  id: string
  returnId: string
  originalSaleItemId: string
  productId?: string | null
  itemType: string
  itemName: string
  sku?: string | null
  quantityReturned: number
  originalQuantity: number
  unitPrice: number
  lineSubtotal: number
  itemDiscountAmount: number
  lineTotal: number
  notes?: string | null
  createdAt: string
}

export interface SaleReturn {
  id: string
  returnNumber: string
  originalSaleId: string
  returnDate: string
  subtotal: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  refundMethod: PaymentMethod
  refundStatus: RefundStatus
  refundedAt?: string | null
  reason: string
  notes?: string | null
  processedById?: string | null
  approvedById?: string | null
  status: SaleReturnStatus
  createdAt: string
  updatedAt: string
  returnItems: SaleReturnItem[]
}

/** A flattened return row enriched with its parent sale + customer for the list. */
export interface SaleReturnRow extends SaleReturn {
  sale?: {
    id: string
    saleNumber: string
    status: SaleStatus
    customer?: { id: string; name: string } | null
  }
}

export interface SaleItem {
  id: string
  saleId: string
  productId?: string | null
  itemType: string
  itemName: string
  sku?: string | null
  quantity: number
  unitPrice: number
  itemTotalDiscountAmount: number
  lineTotal: number
  notes?: string | null
  product?: { id: string; name: string; code?: string; uom?: { symbol?: string } } | null
  returnItems?: Array<{ id: string; quantityReturned: number }>
}

export interface Sale {
  id: string
  saleNumber: string
  status: SaleStatus
  paymentStatus: string
  customerId?: string | null
  saleDate: string
  totalAmount: number
  customer?: { id: string; name: string; phone?: string; email?: string } | null
  saleItems?: SaleItem[]
  returns?: SaleReturn[]
}

export interface CreateSaleReturnDto {
  reason: string
  refundMethod: PaymentMethod
  returnDate?: string
  notes?: string
  items: Array<{
    saleItemId: string
    quantity: number
    reason?: string
  }>
}

export interface SaleReturnQueryParams {
  search?: string
  status?: SaleStatus
  customerId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const buildSearchParams = (params: Record<string, unknown>): string => {
  const searchParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  return searchParams.toString()
}

/** Returnable qty left for a sale item = original quantity − already returned. */
export const getReturnableQuantity = (item: SaleItem): number => {
  const alreadyReturned = (item.returnItems ?? []).reduce(
    (sum, ri) => sum + Number(ri.quantityReturned || 0),
    0,
  )
  return Math.max(0, Number(item.quantity || 0) - alreadyReturned)
}

// ─── List ─────────────────────────────────────────────────────────────────────

/**
 * List sale returns.
 *
 * The backend has no standalone return-list endpoint, so we fetch all sales
 * (returns are embedded as `sale.returns[]`) and flatten them into return rows.
 * Search, SORT and PAGINATION are all applied CLIENT-SIDE over the flattened
 * returns — so `meta.total`/page count and the row order reflect the RETURNS
 * themselves (not the underlying sales). Returns `{ data, meta }` for the
 * shared <Pagination>.
 *
 * Bound: fetches up to 1000 sales in one call (no server return-list endpoint
 * exists yet); fine for current volumes.
 */
export const useSaleReturns = (params: SaleReturnQueryParams = {}) => {
  return useQuery({
    queryKey: ['sale-returns', params],
    queryFn: async () => {
      const page = params.page ?? 1
      const limit = params.limit ?? 10

      // Fetch ALL sales (with embedded returns) by paging at the backend's max
      // limit of 100 (PaginationDto @Max(100)); we paginate/sort the returns
      // ourselves below since the backend has no return-list endpoint. Only the
      // sale-level `status` filter is pushed down.
      const extractSales = (resp: any): Sale[] =>
        Array.isArray(resp?.data)
          ? resp.data
          : Array.isArray(resp?.data?.data)
            ? resp.data.data
            : Array.isArray(resp)
              ? resp
              : []
      const sales: Sale[] = []
      const SALES_PAGE_SIZE = 100
      let salesPage = 1
      // safety cap: 50 pages × 100 = 5000 sales
      while (salesPage <= 50) {
        const salesQs = buildSearchParams({
          page: salesPage,
          limit: SALES_PAGE_SIZE,
          status: params.status,
        })
        const { data: response } = await apiClient.get(`/sales?${salesQs}`)
        const batch = extractSales(response)
        sales.push(...batch)
        const m = response?.meta ?? response?.data?.meta
        const totalPages = Number(m?.totalPages ?? 1)
        if (batch.length === 0 || salesPage >= totalPages) break
        salesPage++
      }

      // Flatten ALL returns across all sales.
      let rows: SaleReturnRow[] = sales.flatMap((sale) =>
        (sale.returns ?? []).map((ret) => ({
          ...ret,
          sale: {
            id: sale.id,
            saleNumber: sale.saleNumber,
            status: sale.status,
            customer: sale.customer
              ? { id: sale.customer.id, name: sale.customer.name }
              : null,
          },
        })),
      )

      // Search (return #, sale #, customer name).
      const search = (params.search || '').toLowerCase().trim()
      if (search) {
        rows = rows.filter(
          (r) =>
            r.returnNumber?.toLowerCase().includes(search) ||
            r.sale?.saleNumber?.toLowerCase().includes(search) ||
            r.sale?.customer?.name?.toLowerCase().includes(search),
        )
      }

      // Date range (inclusive) over each return's returnDate — applied client-side
      // since returns are flattened out of the sales list, not a server endpoint.
      if (params.startDate || params.endDate) {
        const fromTs = params.startDate ? new Date(params.startDate).setHours(0, 0, 0, 0) : null
        const toTs = params.endDate ? new Date(params.endDate).setHours(23, 59, 59, 999) : null
        rows = rows.filter((r) => {
          const ts = new Date(r.returnDate).getTime()
          if (Number.isNaN(ts)) return false
          if (fromTs !== null && ts < fromTs) return false
          if (toTs !== null && ts > toTs) return false
          return true
        })
      }

      // Sort over the return rows themselves.
      if (params.sortBy) {
        const dir = params.sortOrder === 'DESC' ? -1 : 1
        const getVal = (r: SaleReturnRow): string | number => {
          switch (params.sortBy) {
            case 'saleNumber': return r.sale?.saleNumber ?? ''
            case 'customer': return r.sale?.customer?.name ?? ''
            case 'totalAmount': return Number(r.totalAmount || 0)
            case 'returnDate': return new Date(r.returnDate).getTime() || 0
            case 'createdAt': return new Date(r.createdAt).getTime() || 0
            case 'status': return r.status ?? ''
            case 'refundStatus': return r.refundStatus ?? ''
            case 'returnNumber':
            default: return r.returnNumber ?? ''
          }
        }
        rows = [...rows].sort((a, b) => {
          const va = getVal(a)
          const vb = getVal(b)
          if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir
          return String(va).localeCompare(String(vb)) * dir
        })
      }

      // Paginate client-side over the returns.
      const total = rows.length
      const totalPages = Math.max(1, Math.ceil(total / limit))
      const start = (page - 1) * limit
      const pageRows = rows.slice(start, start + limit)

      return {
        data: pageRows,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      }
    },
    placeholderData: keepPreviousData,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── Detail ───────────────────────────────────────────────────────────────────

/**
 * Get a single sale return by its id.
 *
 * Requires the parent `saleId` because the return lives inside the sale
 * (`GET /sales/:saleId` → `sale.returns[]`). Returns the matching return
 * enriched with its sale/customer context.
 */
export const useSaleReturn = (saleId: string, returnId: string) => {
  return useQuery({
    queryKey: ['sale-return', saleId, returnId],
    queryFn: async (): Promise<SaleReturnRow | null> => {
      const { data: response } = await apiClient.get(`/sales/${saleId}`)
      const sale: Sale = response?.data || response
      const ret = (sale?.returns ?? []).find((r) => r.id === returnId)
      if (!ret) return null
      return {
        ...ret,
        sale: {
          id: sale.id,
          saleNumber: sale.saleNumber,
          status: sale.status,
          customer: sale.customer
            ? { id: sale.customer.id, name: sale.customer.name }
            : null,
        },
      }
    },
    enabled: !!saleId && !!returnId,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── Sale lookups for the create picker ─────────────────────────────────────────

/** Completed sales (the only ones eligible for a return) for the sale selector. */
export const useCompletedSales = (params: { search?: string } = {}) => {
  return useQuery({
    queryKey: ['sale-returns-eligible-sales', params],
    queryFn: async () => {
      const qs = buildSearchParams({
        status: 'COMPLETED',
        page: 1,
        limit: 50,
        sortBy: 'createdAt',
        sortOrder: 'DESC',
        search: params.search,
      })
      const { data: response } = await apiClient.get(`/sales?${qs}`)
      const sales: Sale[] = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.data)
          ? response.data.data
          : []
      return sales
    },
    retry: 1,
    staleTime: 60 * 1000,
  })
}

/** Full sale detail (with `saleItems` + their `returnItems`) for building the picker. */
export const useSaleForReturn = (saleId: string) => {
  return useQuery({
    queryKey: ['sale-for-return', saleId],
    queryFn: async (): Promise<Sale> => {
      const { data: response } = await apiClient.get(`/sales/${saleId}`)
      return response?.data || response
    },
    enabled: !!saleId,
    retry: 1,
    staleTime: 60 * 1000,
  })
}

// ─── Create ───────────────────────────────────────────────────────────────────

/** Create a return against a COMPLETED sale: POST /sales/:saleId/returns. */
export const useCreateSaleReturn = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ saleId, data }: { saleId: string; data: CreateSaleReturnDto }) => {
      const { data: response } = await apiClient.post(`/sales/${saleId}/returns`, data)
      return (response?.data || response) as SaleReturn
    },
    onSuccess: async (_, { saleId }) => {
      await queryClient.invalidateQueries({ queryKey: ['sale-returns'] })
      await queryClient.invalidateQueries({ queryKey: ['sale-for-return', saleId] })
      // Sale detail / list (owned by other pages) may also have changed.
      await queryClient.invalidateQueries({ queryKey: ['sales'] })
      await queryClient.invalidateQueries({ queryKey: ['sale', saleId] })
    },
  })
}
