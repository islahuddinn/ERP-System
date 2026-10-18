import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TerritoryMeta } from './useRegions'
import type { BranchLookup } from './useBranchStock'
import { formatSalesPersonName, type CustomerOrderSalesPerson } from './useCustomerOrders'
import type { BranchStockTransferStatus } from './useBranchStockTransfers'

export type BranchStockRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface BranchStockRequestProduct {
  id: string
  name: string
  code: string
}

export interface BranchStockRequestItem {
  id: string
  requestId: string
  productId: string
  quantity: number
  unitPrice: number | string | null
  totalAmount: number | string | null
  product?: BranchStockRequestProduct
}

export interface BranchStockRequestTransferSummary {
  id: string
  transferNumber: string
  status: BranchStockTransferStatus
  createdAt: string
  items: {
    id: string
    requestItemId: string
    quantity: number
    receivedQuantity: number | null
  }[]
}

export interface BranchStockRequest {
  id: string
  requestNumber: string
  requesterBranchId: string
  fulfillerBranchId: string | null
  status: BranchStockRequestStatus
  requestedById: string
  approvedById: string | null
  requestDate: string
  approvedAt: string | null
  notes?: string | null
  createdAt: string
  updatedAt: string
  requesterBranch?: BranchLookup
  fulfillerBranch?: BranchLookup | null
  requestedBy?: CustomerOrderSalesPerson
  approvedBy?: CustomerOrderSalesPerson | null
  items?: BranchStockRequestItem[]
  transfers?: BranchStockRequestTransferSummary[]
  _count?: { items: number }
}

export interface BranchStockRequestFilters {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  requesterBranchId?: string
  fulfillerBranchId?: string
  status?: BranchStockRequestStatus
}

export interface BranchStockRequestsResponse {
  data: BranchStockRequest[]
  meta: TerritoryMeta | null
}

export interface CreateBranchStockRequestItemPayload {
  productId: string
  quantity: number
}

export interface CreateBranchStockRequestPayload {
  items: CreateBranchStockRequestItemPayload[]
  notes?: string
}

export interface ShipBranchStockRequestItemPayload {
  requestItemId: string
  quantity: number
}

export interface ShipBranchStockRequestPayload {
  items: ShipBranchStockRequestItemPayload[]
}

const KEY = 'branch-stock-requests'

export const BRANCH_STOCK_REQUEST_STATUS_LABELS: Record<BranchStockRequestStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

export function formatBranchStockEmployeeName(
  employee?: CustomerOrderSalesPerson | null,
): string {
  return formatSalesPersonName(employee ?? undefined)
}

export function formatFulfillerBranchName(
  fulfillerBranch?: BranchLookup | null,
): string {
  return fulfillerBranch?.name ?? 'Factory'
}

/** Outstanding quantity per request line — mirrors backend computeRemainingBalance. */
export function computeRemainingRequestBalance(
  request: BranchStockRequest,
): Record<string, number> {
  const committedByRequestItemId: Record<string, number> = {}

  for (const transfer of request.transfers ?? []) {
    if (transfer.status === 'CANCELLED') continue

    for (const transferItem of transfer.items ?? []) {
      const contribution =
        transfer.status === 'RECEIVED'
          ? (transferItem.receivedQuantity ?? transferItem.quantity)
          : transferItem.quantity

      committedByRequestItemId[transferItem.requestItemId] =
        (committedByRequestItemId[transferItem.requestItemId] ?? 0) + contribution
    }
  }

  return Object.fromEntries(
    (request.items ?? []).map((requestItem) => [
      requestItem.id,
      requestItem.quantity - (committedByRequestItemId[requestItem.id] ?? 0),
    ]),
  )
}

function invalidateBranchStockRequestQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  request?: BranchStockRequest,
) {
  queryClient.invalidateQueries({ queryKey: [KEY] })

  if (request?.id) {
    queryClient.invalidateQueries({ queryKey: [KEY, request.id] })
  }

  queryClient.invalidateQueries({ queryKey: ['branch-stock-transfers'] })
  queryClient.invalidateQueries({ queryKey: ['branch-stock'] })
  queryClient.invalidateQueries({ queryKey: ['branch-ledger'] })
}

export function useBranchStockRequests(branchStockRequestFilters: BranchStockRequestFilters = {}) {
  return useQuery({
    queryKey: [KEY, branchStockRequestFilters],
    queryFn: async (): Promise<BranchStockRequestsResponse> => {
      const { data: response } = await apiClient.get('/sales-management/branch-stock-requests', {
        params: branchStockRequestFilters,
      })
      return {
        data: response?.data ?? (Array.isArray(response) ? response : []),
        meta: response?.meta ?? null,
      }
    },
    placeholderData: keepPreviousData,
  })
}

export function useBranchStockRequest(requestId: string) {
  return useQuery({
    queryKey: [KEY, requestId],
    queryFn: async () => {
      const { data: response } = await apiClient.get(
        `/sales-management/branch-stock-requests/${requestId}`,
      )
      return (response?.data || response) as BranchStockRequest
    },
    enabled: !!requestId,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useCreateBranchStockRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (createBranchStockRequestPayload: CreateBranchStockRequestPayload) => {
      const { data: response } = await apiClient.post(
        '/sales-management/branch-stock-requests',
        createBranchStockRequestPayload,
      )
      return (response?.data || response) as BranchStockRequest
    },
    onSuccess: (request) => {
      invalidateBranchStockRequestQueries(queryClient, request)
      toast.success(`Request ${request.requestNumber} submitted — pending approval`)
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to create branch stock request'))
    },
  })
}

export function useApproveBranchStockRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data: response } = await apiClient.patch(
        `/sales-management/branch-stock-requests/${requestId}/approve`,
      )
      return (response?.data || response) as BranchStockRequest
    },
    onSuccess: (request) => {
      invalidateBranchStockRequestQueries(queryClient, request)
      toast.success(`Request ${request.requestNumber} approved — ship stock separately`)
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to approve branch stock request'))
    },
  })
}

export function useRejectBranchStockRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data: response } = await apiClient.patch(
        `/sales-management/branch-stock-requests/${requestId}/reject`,
      )
      return (response?.data || response) as BranchStockRequest
    },
    onSuccess: (request) => {
      invalidateBranchStockRequestQueries(queryClient, request)
      toast.success(`Request ${request.requestNumber} rejected`)
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to reject branch stock request'))
    },
  })
}

export function useShipBranchStockRequest() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      requestId,
      shipBranchStockRequestPayload,
    }: {
      requestId: string
      shipBranchStockRequestPayload: ShipBranchStockRequestPayload
    }) => {
      const { data: response } = await apiClient.post(
        `/sales-management/branch-stock-requests/${requestId}/transfers`,
        shipBranchStockRequestPayload,
      )
      return response?.data || response
    },
    onSuccess: (_transfer, variables) => {
      queryClient.invalidateQueries({ queryKey: [KEY] })
      queryClient.invalidateQueries({ queryKey: [KEY, variables.requestId] })
      queryClient.invalidateQueries({ queryKey: ['branch-stock-transfers'] })
      queryClient.invalidateQueries({ queryKey: ['branch-stock'] })
      queryClient.invalidateQueries({ queryKey: ['branch-ledger'] })
      toast.success('Transfer dispatched — awaiting receipt at destination branch')
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to ship branch stock transfer'))
    },
  })
}

export function validateShipQuantities(
  items: BranchStockRequestItem[],
  shipQuantities: Record<string, number>,
  remainingByItemId: Record<string, number>,
): string | null {
  const includedItems = items.filter((item) => {
    const quantity = shipQuantities[item.id]
    return quantity !== undefined && !Number.isNaN(quantity) && quantity > 0
  })

  if (includedItems.length === 0) {
    return 'Include at least one item with a quantity greater than zero.'
  }

  for (const item of includedItems) {
    const quantity = shipQuantities[item.id]
    const remaining = remainingByItemId[item.id] ?? 0
    const productName = item.product?.name ?? 'this product'

    if (quantity > remaining) {
      return `Cannot ship ${quantity} of ${productName} — only ${remaining} remains outstanding.`
    }
  }

  return null
}

export function buildShipRequestPayload(
  items: BranchStockRequestItem[],
  shipQuantities: Record<string, number>,
): ShipBranchStockRequestPayload {
  return {
    items: items
      .filter((item) => {
        const quantity = shipQuantities[item.id]
        return quantity !== undefined && !Number.isNaN(quantity) && quantity > 0
      })
      .map((item) => ({
        requestItemId: item.id,
        quantity: shipQuantities[item.id],
      })),
  }
}
