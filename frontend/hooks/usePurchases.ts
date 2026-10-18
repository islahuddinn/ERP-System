import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { isDummyDataEnabled } from '@/lib/dummy-data'

const getUseDummyData = () => isDummyDataEnabled()

// ─── Enums ────────────────────────────────────────────────────────────────────

export type PurchaseStatus = 'DRAFT' | 'CONFIRMED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED'

export type EPaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED' | 'CANCELLED'

export type PaymentMethod = 'CASH' | 'CARD' | 'MOBILE_PAYMENT' | 'BANK_TRANSFER' | 'CHEQUE' | 'OTHER' | 'CREDIT'

export type ReturnStatus = 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED' | 'CANCELLED'

export type POApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type ReturnApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type ApprovalDecision = 'APPROVED' | 'REJECTED'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface PurchaseOrderApproval {
  id: string
  purchaseOrderId: string
  approverId: string
  status: POApprovalStatus
  remarks?: string | null
  decidedAt?: string | null
  createdAt: string
  updatedAt: string
  approver?: { id: string; firstName?: string; lastName?: string; name?: string; email: string } | null
}

// One approver's decision row on a purchase return (mirrors PurchaseOrderApproval).
export interface PurchaseReturnApproval {
  id: string
  returnId: string
  approverId: string
  status: ReturnApprovalStatus
  remarks?: string | null
  decidedAt?: string | null
  createdAt: string
  updatedAt: string
  approver?: { id: string; firstName?: string; lastName?: string; name?: string; email: string } | null
}

export interface PurchasePayment {
  id: string
  purchaseOrderId: string
  amount: number
  paymentMethod: PaymentMethod
  referenceNumber?: string | null
  bankAccountId?: string | null
  bankAccount?: { id: string; bankName: string; accountTitle: string; accountNumber: string } | null
  paymentDate: string
  notes?: string | null
  paidById: string
  updatedById?: string | null
  createdAt: string
  updatedAt: string
}

export interface PurchaseOrder {
  id: string
  orderNumber: string
  supplierId?: string | null
  supplier: {
    id: string
    name: string
    contactPerson?: string
    email?: string
    phone?: string
  }
  supplierName?: string | null
  orderDate: string
  expectedDate?: string
  status: PurchaseStatus
  paymentStatus: EPaymentStatus
  subTotal: number
  shippingCost: number
  totalAmount: number
  remainingAmount: number
  amountPaid: number
  remarks?: string
  items: Array<{
    id: string
    purchaseOrderId: string
    rawMaterial: {
      id: string
      name: string
      code: string
      uom: {
        id: string
        name: string
        symbol: string
      }
    }
    quantity: number
    receivedQty: number
    unitPrice: number
    totalPrice: number
    notes?: string
  }>
  payments?: PurchasePayment[]
  approvals?: PurchaseOrderApproval[]
  createdBy?: { id: string; firstName?: string; lastName?: string; name?: string; email: string } | null
  createdById: string
  createdAt: string
  updatedAt: string
  // Relation counts from the backend include — `grns` tells the UI whether a GRN
  // already exists for this PO (only one GRN allowed per PO).
  _count?: { grns?: number }
}

export interface CreatePurchaseOrderDto {
  supplierId?: string
  referenceNo?: string
  orderDate?: string
  expectedDate?: string
  shippingCost?: number
  remarks?: string
  approverIds?: string[]
  items: Array<{
    rawMaterialId: string
    quantity: number
    unitPrice: number
    notes?: string
  }>
}

export interface UpdatePurchaseOrderDto {
  supplierId?: string
  referenceNo?: string | null
  orderDate?: string
  expectedDate?: string | null
  shippingCost?: number | null
  remarks?: string | null
  approverIds?: string[]
  items?: Array<{
    id?: string
    rawMaterialId?: string
    quantity?: number
    unitPrice?: number
    notes?: string | null
  }>
}

export interface CreatePurchaseReturnDto {
  purchaseOrderId: string
  grnId?: string
  returnDate?: string
  reason: string
  remarks?: string
  approverIds?: string[]
  items: Array<{
    id?: string
    rawMaterialId: string
    batchId: string
    grnItemId?: string
    purchaseItemId?: string
    quantity: number
    unitPrice?: number
    reason?: string
  }>
}

// Update payload for a purchase return. Optional fields are nullable so the UI can
// send an explicit `null` to clear a previously-saved value (QA #46) — sending
// `undefined`/omitting the key leaves the old value untouched.
export interface UpdatePurchaseReturnDto {
  purchaseOrderId?: string
  grnId?: string | null
  returnDate?: string
  reason?: string
  remarks?: string | null
  items?: Array<{
    id?: string
    rawMaterialId?: string
    batchId?: string
    grnItemId?: string
    purchaseItemId?: string
    quantity?: number
    reason?: string | null
  }>
}

export interface PurchaseQueryParams {
  search?: string
  supplierId?: string
  status?: PurchaseStatus
  paymentStatus?: EPaymentStatus
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface PurchaseReturnQueryParams {
  search?: string
  supplierId?: string
  purchaseOrderId?: string
  grnId?: string
  status?: ReturnStatus
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
    if (value !== undefined && value !== '') {
      searchParams.append(key, String(value))
    }
  })
  return searchParams.toString()
}

// ─── Purchase Order Hooks ─────────────────────────────────────────────────────

// Get all purchase orders
export const usePurchases = (params: PurchaseQueryParams = {}) => {
  return useQuery({
    queryKey: ['purchases', params],
    queryFn: async () => {
      if (getUseDummyData()) {
        const { getDummyPurchases } = await import('@/data/dummy/dashboard')
        const purchases = getDummyPurchases()
        return { data: purchases, meta: { total: purchases.length } }
      }
      const qs = buildSearchParams(params as Record<string, unknown>)
      const { data: response } = await apiClient.get(`/purchase-orders?${qs}`)
      // Backend wraps as: { success, message, data: [...], meta: { total, page, limit, totalPages } }
      // `response.data` is the array and `response.meta` is the pagination meta — keep both.
      const list = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.data)
          ? response.data.data
          : Array.isArray(response)
            ? response
            : []
      const meta = response?.meta ?? response?.data?.meta ?? { total: list.length }
      return { data: list, meta }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Get single purchase order
export const usePurchase = (id: string) => {
  return useQuery({
    queryKey: ['purchase', id],
    queryFn: async () => {
      if (getUseDummyData()) {
        const { getDummyPurchases } = await import('@/data/dummy/dashboard')
        const purchases = getDummyPurchases()
        const purchase = purchases.find((p: any) => p.id === id)
        return (purchase || purchases[0]) as unknown as PurchaseOrder
      }
      const { data: response } = await apiClient.get(`/purchase-orders/${id}`)
      // Extract data from wrapped response: { success: true, data: {...}, message: "..." }
      return response?.data || response
    },
    enabled: !!id,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })
}

// Create purchase order
export const useCreatePurchase = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreatePurchaseOrderDto) => {
      const { data: response } = await apiClient.post('/purchase-orders', data)
      // Extract data from wrapped response: { success: true, data: {...}, message: "..." }
      return response?.data || response
    },
    onSuccess: async (newPurchase) => {
      // Optimistically update all purchase queries with the new purchase
      queryClient.setQueriesData({ queryKey: ['purchases'] }, (oldData: any) => {
        if (!oldData) return oldData

        // Handle different response structures
        const dataArray = Array.isArray(oldData)
          ? oldData
          : (oldData?.data || [])

        // Check if purchase already exists (avoid duplicates)
        if (dataArray.some((p: any) => p.id === newPurchase?.id)) {
          return oldData
        }

        // Add new purchase to the beginning of the array
        if (Array.isArray(oldData)) {
          return [newPurchase, ...oldData]
        } else if (oldData?.data) {
          return {
            ...oldData,
            data: [newPurchase, ...dataArray],
            meta: oldData.meta ? {
              ...oldData.meta,
              total: (oldData.meta.total || 0) + 1
            } : undefined
          }
        }
        return oldData
      })

      // Invalidate and refetch all purchase queries
      await queryClient.invalidateQueries({ queryKey: ['purchases'] })
      // Keep the summary cards (counts/values) in sync after a create (QA #49).
      await queryClient.invalidateQueries({ queryKey: ['purchase-summary'] })
      // Explicitly refetch to ensure UI updates
      await queryClient.refetchQueries({ queryKey: ['purchases'] })
    },
  })
}

// Update purchase order
export const useUpdatePurchase = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePurchaseOrderDto }) => {
      const { data: response } = await apiClient.patch(`/purchase-orders/${id}`, data)
      // Extract data from wrapped response: { success: true, data: {...}, message: "..." }
      return response?.data || response
    },
    onSuccess: async (_, { id }) => {
      await queryClient.invalidateQueries({ queryKey: ['purchases'] })
      await queryClient.invalidateQueries({ queryKey: ['purchase', id] })
      await queryClient.refetchQueries({ queryKey: ['purchases'] })
    },
  })
}

// Update purchase order status
export const useUpdatePurchaseStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: PurchaseStatus }) => {
      const { data: response } = await apiClient.patch(`/purchase-orders/${id}/status`, { status })
      return response?.data || response
    },
    onSuccess: async (_, { id }) => {
      await queryClient.invalidateQueries({ queryKey: ['purchases'] })
      await queryClient.invalidateQueries({ queryKey: ['purchase', id] })
    },
  })
}

// Approve / reject a purchase order (approver decision)
export const useApprovePurchaseOrder = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      decision,
      remarks,
    }: {
      id: string
      decision: ApprovalDecision
      remarks?: string
    }) => {
      const body: { decision: ApprovalDecision; remarks?: string } = { decision }
      if (remarks) body.remarks = remarks
      const { data: response } = await apiClient.post(`/purchase-orders/${id}/approve`, body)
      return response?.data || response
    },
    onSuccess: async (_, { id }) => {
      await queryClient.invalidateQueries({ queryKey: ['purchases'] })
      await queryClient.invalidateQueries({ queryKey: ['purchase', id] })
      await queryClient.refetchQueries({ queryKey: ['purchase', id] })
    },
  })
}

// Delete purchase order
export const useDeletePurchase = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/purchase-orders/${id}`)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['purchases'] })
      // Keep the summary cards (counts/values) in sync after a delete (QA #49).
      await queryClient.invalidateQueries({ queryKey: ['purchase-summary'] })
      await queryClient.refetchQueries({ queryKey: ['purchases'] })
    },
  })
}

// ─── Payment Hooks ────────────────────────────────────────────────────────────

// Get payments for a purchase order
export const useGetPayments = (purchaseOrderId: string) => {
  return useQuery({
    queryKey: ['purchase-payments', purchaseOrderId],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/purchase-orders/${purchaseOrderId}/payments`)
      return (response?.data || response) as PurchasePayment[]
    },
    enabled: !!purchaseOrderId,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })
}

// Add payment to a purchase order
export const useAddPayment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: {
        amount: number
        paymentMethod: PaymentMethod
        referenceNumber?: string
        bankAccountId?: string
        notes?: string
      }
    }) => {
      const { data: response } = await apiClient.post(`/purchase-orders/${id}/payments`, data)
      return response?.data || response
    },
    onSuccess: async (_, { id }) => {
      await queryClient.invalidateQueries({ queryKey: ['purchases'] })
      await queryClient.invalidateQueries({ queryKey: ['purchase', id] })
      await queryClient.invalidateQueries({ queryKey: ['purchase-payments', id] })
    },
  })
}

// Update a payment on a purchase order
export const useUpdatePayment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      purchaseOrderId,
      paymentId,
      data,
    }: {
      purchaseOrderId: string
      paymentId: string
      data: {
        amount: number
        paymentMethod?: string
        referenceNumber?: string
        bankAccountId?: string
        notes?: string
      }
    }) => {
      const { data: response } = await apiClient.patch(
        `/purchase-orders/${purchaseOrderId}/payments/${paymentId}`,
        data,
      )
      return response?.data || response
    },
    onSuccess: async (_, { purchaseOrderId }) => {
      await queryClient.invalidateQueries({ queryKey: ['purchase', purchaseOrderId] })
      await queryClient.invalidateQueries({ queryKey: ['purchase-payments', purchaseOrderId] })
    },
  })
}

// ─── Summary / Analytics Hooks ────────────────────────────────────────────────

// Purchase order summary stats
export const usePurchaseSummary = (params?: { startDate?: string; endDate?: string }) => {
  return useQuery({
    queryKey: ['purchase-summary', params],
    queryFn: async () => {
      const qs = params ? buildSearchParams(params as Record<string, unknown>) : ''
      const { data: response } = await apiClient.get(`/purchase-orders/summary${qs ? `?${qs}` : ''}`)
      return response?.data || response
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })
}

// Monthly trends
export const usePurchaseMonthlyTrends = (params?: { startDate?: string; endDate?: string }) => {
  return useQuery({
    queryKey: ['purchase-monthly-trends', params],
    queryFn: async () => {
      const qs = params ? buildSearchParams(params as Record<string, unknown>) : ''
      const { data: response } = await apiClient.get(
        `/purchase-orders/summary/monthly-trends${qs ? `?${qs}` : ''}`,
      )
      return (response?.data || response) as Array<{
        month: string
        total_orders: number
        total_value: number
      }>
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })
}

// Top suppliers
export const useTopSuppliers = (params?: {
  startDate?: string
  endDate?: string
  limit?: number
}) => {
  return useQuery({
    queryKey: ['purchase-top-suppliers', params],
    queryFn: async () => {
      const qs = params ? buildSearchParams(params as Record<string, unknown>) : ''
      const { data: response } = await apiClient.get(
        `/purchase-orders/summary/top-suppliers${qs ? `?${qs}` : ''}`,
      )
      return (response?.data || response) as Array<{
        id: string
        name: string
        email: string
        totalValue: number
        orderCount: number
        averageOrderValue: number
      }>
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })
}

// Dropdown list (lightweight)
export const usePurchasesDropdown = () => {
  return useQuery({
    queryKey: ['purchases-dropdown'],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/purchase-orders/dropdown')
      return (response?.data || response) as Array<{
        id: string
        orderNumber: string
        orderDate: string
        status: PurchaseStatus
        paymentStatus: EPaymentStatus
        supplier: { id: string; name: string }
      }>
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })
}

// ─── Purchase Return Hooks ────────────────────────────────────────────────────

// Get purchase returns
export const usePurchaseReturns = (params: PurchaseReturnQueryParams = {}) => {
  return useQuery({
    queryKey: ['purchase-returns', params],
    queryFn: async () => {
      if (getUseDummyData()) {
        return { data: [], meta: { total: 0 } }
      }
      const qs = buildSearchParams(params as Record<string, unknown>)
      const { data: response } = await apiClient.get(`/purchase-returns?${qs}`)
      // Backend wraps as: { success, message, data: [...], meta: {...} } (or a nested
      // { data: { data, meta } }). Normalize to a flat { data, meta } shape so list pages
      // can read items + pagination meta consistently.
      const list = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.data)
          ? response.data.data
          : Array.isArray(response)
            ? response
            : []
      const meta = response?.meta ?? response?.data?.meta ?? { total: list.length }
      return { data: list, meta }
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })
}

// Get single purchase return
export const useGetPurchaseReturn = (returnId: string) => {
  return useQuery({
    queryKey: ['purchase-return', returnId],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/purchase-returns/${returnId}`)
      return response?.data || response
    },
    enabled: !!returnId,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })
}

// Create purchase return
export const useCreatePurchaseReturn = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: CreatePurchaseReturnDto) => {
      const { data: response } = await apiClient.post('/purchase-returns', data)
      // Extract data from wrapped response: { success: true, data: {...}, message: "..." }
      return response?.data || response
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-returns'] })
      await queryClient.invalidateQueries({ queryKey: ['purchases'] })
    },
  })
}

// Update purchase return
export const useUpdatePurchaseReturn = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ returnId, data }: { returnId: string; data: UpdatePurchaseReturnDto }) => {
      const { data: response } = await apiClient.patch(`/purchase-returns/${returnId}`, data)
      return response?.data || response
    },
    onSuccess: async (_, { returnId }) => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-returns'] })
      await queryClient.invalidateQueries({ queryKey: ['purchase-return', returnId] })
    },
  })
}

// Update purchase return status
export const useUpdateReturnStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      returnId,
      status,
      reason,
    }: {
      returnId: string
      status: ReturnStatus
      reason?: string
    }) => {
      const body: { status: ReturnStatus; reason?: string } = { status }
      if (reason !== undefined) body.reason = reason
      const { data: response } = await apiClient.patch(`/purchase-returns/${returnId}/status`, body)
      return response?.data || response
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-returns'] })
    },
  })
}

// Approve / reject a purchase return (assigned-approver decision).
// Posts to POST /purchase-returns/:id/approve with { decision, remarks }.
export const useApprovePurchaseReturn = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      returnId,
      decision,
      remarks,
    }: {
      returnId: string
      decision: ApprovalDecision
      remarks?: string
    }) => {
      const body: { decision: ApprovalDecision; remarks?: string } = { decision }
      if (remarks) body.remarks = remarks
      const { data: response } = await apiClient.post(`/purchase-returns/${returnId}/approve`, body)
      return response?.data || response
    },
    onSuccess: async (_, { returnId }) => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-returns'] })
      await queryClient.invalidateQueries({ queryKey: ['purchase-return', returnId] })
    },
  })
}

// Delete purchase return
export const useDeletePurchaseReturn = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (returnId: string) => {
      await apiClient.delete(`/purchase-returns/${returnId}`)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['purchase-returns'] })
    },
  })
}
