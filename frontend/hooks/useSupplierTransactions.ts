import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'

export interface SupplierTransaction {
    id: string
    supplierId: string
    date: string
    type: 'PURCHASE' | 'PAYMENT' | 'RETURN' | 'ADJUSTMENT'
    reference: string
    description: string
    debit: string    // Prisma Decimal — parseFloat() before arithmetic
    credit: string   // Prisma Decimal — parseFloat() before arithmetic
    notes?: string
    createdAt: string
    updatedAt: string
}

export interface CreateSupplierTransactionDto {
    date: string
    type: 'PURCHASE' | 'PAYMENT' | 'RETURN' | 'ADJUSTMENT'
    reference?: string
    description: string
    debit: number
    credit: number
    notes?: string
}

export interface UpdateSupplierTransactionDto {
    date?: string
    type?: 'PURCHASE' | 'PAYMENT' | 'RETURN' | 'ADJUSTMENT'
    reference?: string
    description?: string
    debit?: number
    credit?: number
    notes?: string
}

export function useSupplierTransactions(supplierId: string) {
    return useQuery({
        queryKey: ['supplier-transactions', supplierId],
        queryFn: async () => {
            if (!supplierId) throw new Error('Supplier ID is required')
            const { data } = await apiClient.get(`/suppliers/${supplierId}/transactions`)
            return data?.data || data
        },
        enabled: !!supplierId,
    })
}

export function useCreateSupplierTransaction(supplierId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (data: CreateSupplierTransactionDto) => {
            const { data: response } = await apiClient.post(`/suppliers/${supplierId}/transactions`, data)
            return response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['supplier-transactions', supplierId] })
            queryClient.invalidateQueries({ queryKey: ['supplier-ledger', supplierId] })
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
            // Refresh the ledger summary/overview cards so Total Payments/Returns/Purchases update (QA #4)
            queryClient.invalidateQueries({ queryKey: ['supplier-ledger-overview'] })
        },
    })
}

export function useUpdateSupplierTransaction(supplierId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateSupplierTransactionDto }) => {
            const { data: response } = await apiClient.patch(`/suppliers/${supplierId}/transactions/${id}`, data)
            return response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['supplier-transactions', supplierId] })
            queryClient.invalidateQueries({ queryKey: ['supplier-ledger', supplierId] })
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
            // Refresh the ledger summary/overview cards so Total Payments/Returns/Purchases update (QA #4)
            queryClient.invalidateQueries({ queryKey: ['supplier-ledger-overview'] })
        },
    })
}

export function useDeleteSupplierTransaction(supplierId: string) {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/suppliers/${supplierId}/transactions/${id}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['supplier-transactions', supplierId] })
            queryClient.invalidateQueries({ queryKey: ['supplier-ledger', supplierId] })
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
            // Refresh the ledger summary/overview cards so Total Payments/Returns/Purchases update (QA #4)
            queryClient.invalidateQueries({ queryKey: ['supplier-ledger-overview'] })
        },
    })
}

