import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import type { TerritoryMeta } from './useRegions'
import type { BranchLookup } from './useBranchStock'
import { formatSalesPersonName, type CustomerOrderSalesPerson } from './useCustomerOrders'

export type BranchStockTransferStatus = 'PENDING' | 'DISPATCHED' | 'RECEIVED' | 'CANCELLED'

export interface BranchStockTransferProduct {
  id: string
  name: string
  code: string
}

export interface BranchStockTransferItem {
  id: string
  transferId: string
  productId: string
  requestItemId: string
  quantity: number
  unitPrice: number | string
  totalAmount: number | string
  receivedQuantity: number | null
  product?: BranchStockTransferProduct
}

export interface BranchStockTransferRequestSummary {
  id: string
  requestNumber: string
}

export interface BranchStockTransfer {
  id: string
  transferNumber: string
  fromBranchId: string | null
  toBranchId: string
  requestId: string
  status: BranchStockTransferStatus
  dispatchedById: string | null
  dispatchedAt: string | null
  receivedById: string | null
  receivedAt: string | null
  cancelledById: string | null
  cancelledAt: string | null
  subtotal: number | string
  totalAmount: number | string
  createdAt: string
  fromBranch?: BranchLookup | null
  toBranch?: BranchLookup
  request?: BranchStockTransferRequestSummary
  dispatchedBy?: CustomerOrderSalesPerson | null
  receivedBy?: CustomerOrderSalesPerson | null
  cancelledBy?: CustomerOrderSalesPerson | null
  items?: BranchStockTransferItem[]
  _count?: { items: number }
}

export interface BranchStockTransferFilters {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  fromBranchId?: string
  toBranchId?: string
  status?: BranchStockTransferStatus
  requestId?: string
}

export interface BranchStockTransfersResponse {
  data: BranchStockTransfer[]
  meta: TerritoryMeta | null
}

export interface ConfirmBranchStockTransferReceiptItemPayload {
  transferItemId: string
  receivedQuantity: number
}

export interface ConfirmBranchStockTransferReceiptPayload {
  items: ConfirmBranchStockTransferReceiptItemPayload[]
}

const KEY = 'branch-stock-transfers'

export const BRANCH_STOCK_TRANSFER_STATUS_LABELS: Record<BranchStockTransferStatus, string> = {
  PENDING: 'Pending',
  DISPATCHED: 'Dispatched',
  RECEIVED: 'Received',
  CANCELLED: 'Cancelled',
}

export function formatBranchStockTransferEmployeeName(
  employee?: CustomerOrderSalesPerson | null,
): string {
  return formatSalesPersonName(employee ?? undefined)
}

export function formatTransferFromBranchName(fromBranch?: BranchLookup | null): string {
  return fromBranch?.name ?? 'Factory'
}

function invalidateBranchStockTransferQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  transfer?: BranchStockTransfer,
) {
  queryClient.invalidateQueries({ queryKey: [KEY] })

  if (transfer?.id) {
    queryClient.invalidateQueries({ queryKey: [KEY, transfer.id] })
  }

  if (transfer?.requestId) {
    queryClient.invalidateQueries({ queryKey: ['branch-stock-requests'] })
    queryClient.invalidateQueries({ queryKey: ['branch-stock-requests', transfer.requestId] })
  }

  queryClient.invalidateQueries({ queryKey: ['branch-stock'] })
  queryClient.invalidateQueries({ queryKey: ['branch-ledger'] })
}

export function useBranchStockTransfers(branchStockTransferFilters: BranchStockTransferFilters = {}) {
  return useQuery({
    queryKey: [KEY, branchStockTransferFilters],
    queryFn: async (): Promise<BranchStockTransfersResponse> => {
      const { data: response } = await apiClient.get('/sales-management/branch-stock-transfers', {
        params: branchStockTransferFilters,
      })
      return {
        data: response?.data ?? (Array.isArray(response) ? response : []),
        meta: response?.meta ?? null,
      }
    },
    placeholderData: keepPreviousData,
  })
}

export function useBranchStockTransfer(transferId: string) {
  return useQuery({
    queryKey: [KEY, transferId],
    queryFn: async () => {
      const { data: response } = await apiClient.get(
        `/sales-management/branch-stock-transfers/${transferId}`,
      )
      return (response?.data || response) as BranchStockTransfer
    },
    enabled: !!transferId,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useConfirmBranchStockTransferReceipt() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      transferId,
      confirmBranchStockTransferReceiptPayload,
    }: {
      transferId: string
      confirmBranchStockTransferReceiptPayload: ConfirmBranchStockTransferReceiptPayload
    }) => {
      const { data: response } = await apiClient.patch(
        `/sales-management/branch-stock-transfers/${transferId}/confirm-receipt`,
        confirmBranchStockTransferReceiptPayload,
      )
      return (response?.data || response) as BranchStockTransfer
    },
    onSuccess: (transfer) => {
      invalidateBranchStockTransferQueries(queryClient, transfer)
      toast.success(`Transfer ${transfer.transferNumber} received — stock and ledger updated`)
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to confirm transfer receipt'))
    },
  })
}

export function useCancelBranchStockTransfer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (transferId: string) => {
      const { data: response } = await apiClient.patch(
        `/sales-management/branch-stock-transfers/${transferId}/cancel`,
      )
      return (response?.data || response) as BranchStockTransfer
    },
    onSuccess: (transfer) => {
      invalidateBranchStockTransferQueries(queryClient, transfer)
      toast.success(`Transfer ${transfer.transferNumber} cancelled — source stock restored`)
    },
    onError: (error: unknown) => {
      toast.error(getApiErrorMessage(error, 'Failed to cancel branch stock transfer'))
    },
  })
}

export function buildConfirmReceiptPayload(
  items: BranchStockTransferItem[],
  receivedQuantities: Record<string, number>,
): ConfirmBranchStockTransferReceiptPayload {
  return {
    items: items.map((item) => ({
      transferItemId: item.id,
      receivedQuantity: receivedQuantities[item.id] ?? 0,
    })),
  }
}

export function validateReceivedQuantities(
  items: BranchStockTransferItem[],
  receivedQuantities: Record<string, number>,
): string | null {
  if (items.length === 0) {
    return 'This transfer has no line items.'
  }

  for (const item of items) {
    const quantity = receivedQuantities[item.id]
    const productName = item.product?.name ?? 'each product'

    if (quantity === undefined || Number.isNaN(quantity)) {
      return `Enter a received quantity for ${productName}.`
    }

    if (quantity < 0) {
      return `Received quantity cannot be negative for ${productName}.`
    }

    if (quantity > item.quantity) {
      return `Received quantity cannot exceed dispatched quantity (${item.quantity}) for ${productName}.`
    }
  }

  const totalReceived = items.reduce((sum, item) => sum + (receivedQuantities[item.id] ?? 0), 0)
  if (totalReceived <= 0) {
    return 'At least one item must have a received quantity greater than zero.'
  }

  return null
}
