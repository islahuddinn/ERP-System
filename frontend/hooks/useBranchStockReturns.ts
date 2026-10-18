import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TerritoryMeta } from './useRegions'
import type { BranchLookup } from './useBranchStock'
import { formatSalesPersonName, type CustomerOrderSalesPerson } from './useCustomerOrders'
import type { BranchStockTransferItem } from './useBranchStockTransfers'

export type BranchStockReturnStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface BranchStockReturnProduct {
  id: string
  name: string
  code: string
}

export interface BranchStockReturnItem {
  id: string
  returnId: string
  transferItemId: string
  productId: string
  quantity: number
  unitPrice: number | string
  totalAmount: number | string
  product?: BranchStockReturnProduct
}

export interface BranchStockReturnTransferSummary {
  id: string
  transferNumber: string
}

export interface BranchStockReturn {
  id: string
  returnNumber: string
  transferId: string
  returningBranchId: string
  receivingBranchId: string | null
  status: BranchStockReturnStatus
  requestedById: string
  approvedById: string | null
  requestDate: string
  approvedAt: string | null
  reason: string
  subtotal: number | string
  totalAmount: number | string
  createdAt: string
  updatedAt: string
  transfer?: BranchStockReturnTransferSummary
  returningBranch?: BranchLookup
  receivingBranch?: BranchLookup | null
  requestedBy?: CustomerOrderSalesPerson
  approvedBy?: CustomerOrderSalesPerson | null
  items?: BranchStockReturnItem[]
  _count?: { items: number }
}

export interface BranchStockReturnFilters {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  transferId?: string
  returningBranchId?: string
  receivingBranchId?: string
  status?: BranchStockReturnStatus
}

export interface BranchStockReturnsResponse {
  data: BranchStockReturn[]
  meta: TerritoryMeta | null
}

export interface CreateBranchStockReturnItemPayload {
  transferItemId: string
  quantity: number
}

export interface CreateBranchStockReturnPayload {
  transferId: string
  items: CreateBranchStockReturnItemPayload[]
  reason: string
}

export interface ReturnableQuantitySummary {
  receivedQuantity: number
  returnedQuantity: number
  remainingQuantity: number
}

const KEY = 'branch-stock-returns'

export const BRANCH_STOCK_RETURN_STATUS_LABELS: Record<BranchStockReturnStatus, string> = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
}

export function formatBranchStockReturnEmployeeName(
  employee?: CustomerOrderSalesPerson | null,
): string {
  return formatSalesPersonName(employee ?? undefined)
}

export function formatReceivingBranchName(receivingBranch?: BranchLookup | null): string {
  return receivingBranch?.name ?? 'Factory'
}

/** Sum non-rejected return quantities per transfer line — mirrors backend guard. */
export function buildReturnedQuantityByTransferItemId(
  returns: BranchStockReturn[],
): Record<string, number> {
  const totals: Record<string, number> = {}

  for (const stockReturn of returns) {
    if (stockReturn.status === 'REJECTED') continue

    for (const item of stockReturn.items ?? []) {
      totals[item.transferItemId] = (totals[item.transferItemId] ?? 0) + Number(item.quantity)
    }
  }

  return totals
}

export function computeReturnableQuantityForItem(
  transferItem: Pick<BranchStockTransferItem, 'id' | 'receivedQuantity'>,
  returnedByItemId: Record<string, number>,
): ReturnableQuantitySummary {
  const receivedQuantity = Number(transferItem.receivedQuantity ?? 0)
  const returnedQuantity = returnedByItemId[transferItem.id] ?? 0
  const remainingQuantity = Math.max(receivedQuantity - returnedQuantity, 0)

  return { receivedQuantity, returnedQuantity, remainingQuantity }
}

export function computeReturnableQuantitiesForTransferItems(
  transferItems: BranchStockTransferItem[],
  existingReturns: BranchStockReturn[],
): Record<string, ReturnableQuantitySummary> {
  const returnedByItemId = buildReturnedQuantityByTransferItemId(existingReturns)

  return Object.fromEntries(
    transferItems.map((item) => [item.id, computeReturnableQuantityForItem(item, returnedByItemId)]),
  )
}

function invalidateBranchStockReturnQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  stockReturn?: BranchStockReturn,
) {
  queryClient.invalidateQueries({ queryKey: [KEY] })

  if (stockReturn?.id) {
    queryClient.invalidateQueries({ queryKey: [KEY, stockReturn.id] })
  }

  if (stockReturn?.transferId) {
    queryClient.invalidateQueries({
      queryKey: [KEY, 'by-transfer', stockReturn.transferId],
    })
  }

  queryClient.invalidateQueries({ queryKey: ['branch-stock-transfers'] })
  queryClient.invalidateQueries({ queryKey: ['branch-stock'] })
  queryClient.invalidateQueries({ queryKey: ['branch-ledger'] })
}

export function useBranchStockReturns(branchStockReturnFilters: BranchStockReturnFilters = {}) {
  return useQuery({
    queryKey: [KEY, branchStockReturnFilters],
    queryFn: async (): Promise<BranchStockReturnsResponse> => {
      const { data: response } = await apiClient.get('/sales-management/branch-stock-returns', {
        params: branchStockReturnFilters,
      })
      return {
        data: response?.data ?? (Array.isArray(response) ? response : []),
        meta: response?.meta ?? null,
      }
    },
    placeholderData: keepPreviousData,
  })
}

/** Fetch returns for one transfer — used on create screen to compute remaining returnable qty per line. */
export function useBranchStockReturnsForTransfer(
  transferId: string | undefined,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [KEY, 'by-transfer', transferId],
    queryFn: async (): Promise<BranchStockReturn[]> => {
      const { data: response } = await apiClient.get('/sales-management/branch-stock-returns', {
        params: { transferId, limit: 200, sortBy: 'requestDate', sortOrder: 'DESC' },
      })
      return response?.data ?? (Array.isArray(response) ? response : [])
    },
    enabled: !!transferId && (options?.enabled ?? true),
    staleTime: 0,
  })
}

export function useBranchStockReturn(returnId: string) {
  return useQuery({
    queryKey: [KEY, returnId],
    queryFn: async () => {
      const { data: response } = await apiClient.get(
        `/sales-management/branch-stock-returns/${returnId}`,
      )
      return (response?.data || response) as BranchStockReturn
    },
    enabled: !!returnId,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useCreateBranchStockReturn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (createBranchStockReturnPayload: CreateBranchStockReturnPayload) => {
      const { data: response } = await apiClient.post(
        '/sales-management/branch-stock-returns',
        createBranchStockReturnPayload,
      )
      return (response?.data || response) as BranchStockReturn
    },
    onSuccess: (stockReturn) => {
      invalidateBranchStockReturnQueries(queryClient, stockReturn)
      toast.success(`Return ${stockReturn.returnNumber} recorded — pending approval`)
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to record branch stock return'))
    },
  })
}

export function useApproveBranchStockReturn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (returnId: string) => {
      const { data: response } = await apiClient.patch(
        `/sales-management/branch-stock-returns/${returnId}/approve`,
      )
      return (response?.data || response) as BranchStockReturn
    },
    onSuccess: (stockReturn) => {
      invalidateBranchStockReturnQueries(queryClient, stockReturn)
      toast.success(`Return ${stockReturn.returnNumber} approved — stock and ledger updated`)
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to approve branch stock return'))
    },
  })
}

export function useRejectBranchStockReturn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (returnId: string) => {
      const { data: response } = await apiClient.patch(
        `/sales-management/branch-stock-returns/${returnId}/reject`,
      )
      return (response?.data || response) as BranchStockReturn
    },
    onSuccess: (stockReturn) => {
      invalidateBranchStockReturnQueries(queryClient, stockReturn)
      toast.success(`Return ${stockReturn.returnNumber} rejected`)
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to reject branch stock return'))
    },
  })
}

export function validateReturnQuantity(
  quantity: number,
  remainingQuantity: number,
  productName?: string,
): string | null {
  const label = productName ?? 'this product'

  if (Number.isNaN(quantity)) {
    return `Enter a return quantity for ${label}.`
  }

  if (quantity <= 0) {
    return `Return quantity must be greater than zero for ${label}.`
  }

  if (quantity > remainingQuantity) {
    return `Cannot return ${quantity} — only ${remainingQuantity} remains returnable for ${label}.`
  }

  return null
}
