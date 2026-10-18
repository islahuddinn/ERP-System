import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

// ─── Enums ────────────────────────────────────────────────────────────────────

export type SaleStatus = 'DRAFT' | 'COMPLETED' | 'CANCELLED'

export type ESalePaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID'

export type SalePaymentMethod =
  | 'CASH'
  | 'CARD'
  | 'MOBILE_PAYMENT'
  | 'BANK_TRANSFER'
  | 'CHEQUE'
  | 'OTHER'
  | 'CREDIT'

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface SaleCustomer {
  id: string
  customerNumber?: string
  name: string
  phone?: string | null
  email?: string | null
}

export interface SaleItem {
  id: string
  saleId: string
  productId?: string | null
  itemType: 'PRODUCT' | 'SERVICE'
  itemName: string
  itemDescription?: string | null
  sku?: string | null
  barcode?: string | null
  quantity: number
  unitPrice: number
  costPrice?: number | null
  lineSubtotal: number
  itemDiscountPercentage: number
  itemDiscountAmount: number
  itemTotalDiscountAmount: number
  lineTotal: number
  notes?: string | null
  createdAt: string
  product?: {
    id: string
    name: string
    code: string
    uom?: { symbol: string }
  }
  returnItems?: Array<{ quantityReturned: number }>
}

export interface SalePayment {
  id: string
  saleId: string
  amount: number
  paymentMethod: SalePaymentMethod
  referenceNumber?: string | null
  paymentDate: string
  notes?: string | null
  createdAt: string
  updatedAt?: string
}

export interface SaleReturn {
  id: string
  returnNumber: string
  originalSaleId: string
  returnDate: string
  totalAmount: number
  refundMethod: SalePaymentMethod
  refundStatus: 'PENDING' | 'PROCESSED' | 'FAILED'
  status: 'PROCESSED'
  reason: string
  notes?: string | null
  createdAt: string
  returnItems?: Array<Record<string, unknown>>
}

export interface Sale {
  id: string
  saleNumber: string
  status: SaleStatus
  paymentStatus: ESalePaymentStatus
  customerId?: string | null
  saleDate: string
  subtotal: number
  itemsDiscountAmount: number
  discountPercentage: number
  discountAmount: number
  totalDiscountAmount: number
  taxPercentage: number
  taxAmount: number
  totalTaxAmount: number
  totalAmount: number
  amountPaid: number
  notes?: string | null
  createdById?: string
  invoiceId?: string | null
  createdAt: string
  updatedAt: string
  customer?: SaleCustomer | null
  saleItems?: SaleItem[]
  payments?: SalePayment[]
  returns?: SaleReturn[]
}

export interface CreateSaleItemDto {
  productId: string
  quantity: number
  unitPrice: number
  // Both per-item discount types may be used together; the backend computes
  // itemTotalDiscountAmount = (lineSubtotal × pct/100) + flatAmount.
  itemDiscountPercentage?: number
  itemDiscountAmount?: number
  notes?: string
}

export interface CreateSaleDto {
  customerId?: string
  saleDate?: string
  items: CreateSaleItemDto[]
  discountPercentage?: number
  discountAmount?: number
  taxPercentage?: number
  taxAmount?: number
  notes?: string
}

export interface UpdateSaleDto {
  customerId?: string
  saleDate?: string
  items?: CreateSaleItemDto[]
  discountPercentage?: number
  discountAmount?: number
  taxPercentage?: number
  taxAmount?: number
  notes?: string
}

export interface SaleQueryParams {
  search?: string
  status?: SaleStatus
  paymentStatus?: ESalePaymentStatus
  customerId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface CreateSalePaymentDto {
  amount: number
  paymentMethod: SalePaymentMethod
  referenceNumber?: string
  paymentDate?: string
  notes?: string
  // Optional: selected customer bank account for BANK_TRANSFER/CHEQUE payments.
  bankAccountId?: string
}

export interface UpdateSalePaymentDto {
  amount?: number
  paymentMethod?: SalePaymentMethod
  referenceNumber?: string
  paymentDate?: string
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

// ─── Sale Hooks ───────────────────────────────────────────────────────────────

// Get all sales (paginated)
export const useSales = (params: SaleQueryParams = {}) => {
  return useQuery({
    queryKey: ['sales', params],
    queryFn: async () => {
      const qs = buildSearchParams(params as Record<string, unknown>)
      const { data: response } = await apiClient.get(`/sales?${qs}`)
      // Backend wraps as: { success, message, data: [...], meta: {...} }
      return {
        data: (response?.data ?? response ?? []) as Sale[],
        meta: response?.meta ?? null,
      }
    },
    placeholderData: keepPreviousData,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })
}

// Get single sale
export const useSale = (saleId: string) => {
  return useQuery({
    queryKey: ['sale', saleId],
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/sales/${saleId}`)
      return (response?.data ?? response) as Sale
    },
    enabled: !!saleId,
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })
}

// Create sale
export const useCreateSale = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: CreateSaleDto) => {
      const { data: response } = await apiClient.post('/sales', data)
      return (response?.data ?? response) as Sale
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['sales'] })
    },
  })
}

// Update sale
export const useUpdateSale = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ saleId, data }: { saleId: string; data: UpdateSaleDto }) => {
      const { data: response } = await apiClient.patch(`/sales/${saleId}`, data)
      return (response?.data ?? response) as Sale
    },
    onSuccess: async (_, { saleId }) => {
      await queryClient.invalidateQueries({ queryKey: ['sales'] })
      await queryClient.invalidateQueries({ queryKey: ['sale', saleId] })
    },
  })
}

// Confirm a DRAFT sale → COMPLETED
export const useConfirmSale = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (saleId: string) => {
      const { data: response } = await apiClient.post(`/sales/${saleId}/confirm`)
      return (response?.data ?? response) as Sale
    },
    onSuccess: async (_, saleId) => {
      await queryClient.invalidateQueries({ queryKey: ['sales'] })
      await queryClient.invalidateQueries({ queryKey: ['sale', saleId] })
    },
  })
}

// Cancel a DRAFT sale → CANCELLED
export const useCancelSale = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (saleId: string) => {
      const { data: response } = await apiClient.post(`/sales/${saleId}/cancel`)
      return (response?.data ?? response) as Sale
    },
    onSuccess: async (_, saleId) => {
      await queryClient.invalidateQueries({ queryKey: ['sales'] })
      await queryClient.invalidateQueries({ queryKey: ['sale', saleId] })
    },
  })
}

// ─── Payment Hooks ────────────────────────────────────────────────────────────

// Record a payment against a COMPLETED sale
export const useAddSalePayment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ saleId, data }: { saleId: string; data: CreateSalePaymentDto }) => {
      const { data: response } = await apiClient.post(`/sales/${saleId}/payments`, data)
      return (response?.data ?? response) as Sale
    },
    onSuccess: async (_, { saleId }) => {
      await queryClient.invalidateQueries({ queryKey: ['sales'] })
      await queryClient.invalidateQueries({ queryKey: ['sale', saleId] })
    },
  })
}

// Correct an existing payment
export const useUpdateSalePayment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      saleId,
      paymentId,
      data,
    }: {
      saleId: string
      paymentId: string
      data: UpdateSalePaymentDto
    }) => {
      const { data: response } = await apiClient.patch(
        `/sales/${saleId}/payments/${paymentId}`,
        data,
      )
      return (response?.data ?? response) as Sale
    },
    onSuccess: async (_, { saleId }) => {
      await queryClient.invalidateQueries({ queryKey: ['sales'] })
      await queryClient.invalidateQueries({ queryKey: ['sale', saleId] })
    },
  })
}

// ─── Dropdown Hooks ───────────────────────────────────────────────────────────

export interface CustomerDropdownItem {
  id: string
  name: string
  customerNumber?: string
  phone?: string | null
  email?: string | null
}

export const useCustomersDropdown = () => {
  return useQuery({
    queryKey: ['customers', 'dropdown'],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/customers/dropdown')
      const list = response?.data ?? response
      return (Array.isArray(list) ? list : []) as CustomerDropdownItem[]
    },
    staleTime: 5 * 60 * 1000,
  })
}
