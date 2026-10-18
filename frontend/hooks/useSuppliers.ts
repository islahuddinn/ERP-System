import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'

export interface Supplier {
    id: string
    name: string
    email?: string
    phone?: string
    address?: string
    notes?: string
    isActive: boolean
    openingBalanceAmount?: string   // Decimal string — parseFloat() before arithmetic
    openingBalanceDate?: string
    openingBalanceNote?: string
    openingBalanceSetById?: string
    deletedAt?: string
    createdById?: string
    updatedById?: string
    createdAt: string
    updatedAt: string
}

export interface SupplierFilters {
    search?: string
    isActive?: boolean
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
}

export interface SupplierMeta {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
}

export interface SuppliersResponse {
    data: Supplier[]
    meta: SupplierMeta | null
}

export function useSuppliers(filters: SupplierFilters = {}) {
    return useQuery({
        queryKey: ['suppliers', filters],
        queryFn: async (): Promise<SuppliersResponse> => {
            const { data: response } = await apiClient.get('/suppliers', { params: filters })
            return {
                data: response?.data ?? (Array.isArray(response) ? response : []),
                meta: response?.meta ?? null,
            }
        },
        placeholderData: keepPreviousData,
    })
}

export function useSupplier(id: string) {
    return useQuery({
        queryKey: ['suppliers', id],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/suppliers/${id}`)
            return (response?.data || response) as Supplier
        },
        enabled: !!id
    })
}

export function useSuppliersDropdown() {
    return useQuery({
        queryKey: ['suppliers', 'dropdown'],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/suppliers/dropdown')
            const responseData = response?.data || response
            return (Array.isArray(responseData) ? responseData : []) as { id: string; name: string }[]
        }
    })
}

export function useCreateSupplier() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (data: {
            name: string
            email?: string
            phone?: string
            address?: string
            notes?: string
            isActive?: boolean
            openingBalance?: { amount: number; date?: string; note?: string }
        }) => {
            const { data: response } = await apiClient.post('/suppliers', data)
            return response?.data || response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
            toast.success('Supplier added successfully')
        }
    })
}

export function useUpdateSupplier() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data }: {
            id: string
            data: Partial<{
                name: string; email: string; phone: string; address: string;
                notes: string; isActive: boolean;
                openingBalance: { amount: number; date?: string; note?: string }
            }>
        }) => {
            const { data: response } = await apiClient.patch(`/suppliers/${id}`, data)
            return response?.data || response
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
            queryClient.invalidateQueries({ queryKey: ['suppliers', variables.id] })
            // Refetch the per-record audit history so the "View History" popup shows
            // the new entry immediately without a page refresh (QA #7).
            queryClient.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'Supplier', variables.id] })
            toast.success('Supplier updated successfully')
        }
    })
}

export function useToggleSupplierActive() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const { data: response } = await apiClient.patch(`/suppliers/${id}/toggle-active`)
            return response?.data || response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
            toast.success('Supplier status updated')
        }
    })
}

export function useDeleteSupplier() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/suppliers/${id}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['suppliers'] })
            toast.success('Supplier deleted successfully')
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to delete supplier')
        }
    })
}
