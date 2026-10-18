import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { Product, PaginatedResponse, PaginationMeta } from '@/types/common'

export type { Product }

export interface ProductFilters {
    search?: string
    type?: 'FINISHED_GOOD' | 'SEMI_FINISHED' | 'CONSUMABLE' | 'SERVICE'
    isActive?: boolean
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
}

export interface ProductsListResponse {
    data: Product[]
    meta: PaginationMeta | null
}

export function useProducts(filters: ProductFilters = {}) {
    return useQuery({
        queryKey: ['products', filters],
        queryFn: async (): Promise<ProductsListResponse> => {
            const params: Record<string, any> = {}
            if (filters.page) params.page = filters.page
            if (filters.limit) params.limit = Math.min(filters.limit, 100)
            if (filters.search?.trim()) params.search = filters.search.trim()
            if (filters.type) params.type = filters.type
            if (filters.isActive !== undefined) params.isActive = filters.isActive
            if (filters.sortBy) params.sortBy = filters.sortBy
            if (filters.sortOrder) params.sortOrder = filters.sortOrder

            const { data: response } = await apiClient.get('/product-management/products', { params })
            return {
                data: response?.data ?? (Array.isArray(response) ? response : []),
                meta: response?.meta ?? null,
            }
        },
        retry: false,
        placeholderData: keepPreviousData,
    })
}

export function useProduct(id: string) {
    return useQuery({
        queryKey: ['products', id],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/product-management/products/${id}`)
            return (response?.data || response) as Product
        },
        enabled: !!id,
        // Always pull a fresh copy when the details/edit screen mounts so an
        // edited price never shows a stale cached value.
        staleTime: 0,
        refetchOnMount: 'always',
    })
}

export function useProductsDropdown() {
    return useQuery({
        queryKey: ['products', 'dropdown'],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/product-management/products/dropdown')
            const responseData = response?.data || response
            return (Array.isArray(responseData) ? responseData : []) as {
                id: string; name: string; code: string; type: string;
                currentStock: number; sellingPrice?: string;
                uom?: { id: string; name: string; symbol: string }
            }[]
        }
    })
}

export function useCreateProduct() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (data: {
            name: string
            code: string
            type: 'FINISHED_GOOD' | 'SEMI_FINISHED' | 'CONSUMABLE' | 'SERVICE'
            uomId: string
            barcode?: string | null
            description?: string | null
            sellingPrice?: number
            minStock?: number
            maxStock?: number
            reorderLevel?: number
            images?: string[]
            attributes?: { name: string; value: string; unit?: string }[]
            isActive?: boolean
        }) => {
            const { data: response } = await apiClient.post('/product-management/products', data)
            return response?.data || response
        },
        onSuccess: async () => {
            await queryClient.invalidateQueries({ queryKey: ['products'] })
            toast.success('Product created successfully')
        }
    })
}

export function useUpdateProduct() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data }: {
            id: string
            data: Partial<{
                name: string; code: string; barcode: string | null; description: string | null;
                type: 'FINISHED_GOOD' | 'SEMI_FINISHED' | 'CONSUMABLE' | 'SERVICE';
                uomId: string; sellingPrice: number | null; minStock: number | null; maxStock: number | null;
                reorderLevel: number; isActive: boolean;
                images: string[];
                attributes: { name: string; value: string; unit?: string }[]
            }>
        }) => {
            const { data: response } = await apiClient.patch(`/product-management/products/${id}`, data)
            return response?.data || response
        },
        onSuccess: (updated, { id }) => {
            // Write the server's updated product straight into the detail cache so
            // the details screen shows the new value immediately (no stale price),
            // then invalidate so the list + detail also refetch fresh.
            if (updated) queryClient.setQueryData(['products', id], updated)
            queryClient.invalidateQueries({ queryKey: ['products'] })
            toast.success('Product updated successfully')
        }
    })
}

export function useToggleProductActive() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const { data: response } = await apiClient.patch(`/product-management/products/${id}/toggle-active`)
            return response?.data || response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
            toast.success('Product status updated')
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to update product status')
        }
    })
}

export function useDeleteProduct() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/product-management/products/${id}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
            toast.success('Product deleted')
        },
        onError: (error: any) => {
            toast.error(error?.response?.data?.message || 'Failed to delete product')
        }
    })
}

export function useBulkImport() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (file: File) => {
            const formData = new FormData()
            formData.append('file', file)
            const { data: response } = await apiClient.post('/product-management/products/bulk-import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            return response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['products'] })
            toast.success('File uploaded successfully. Processing started.')
        },
        onError: (error: any) => {
            const message = error?.response?.data?.message || error?.message || 'Failed to upload file'
            toast.error(Array.isArray(message) ? message[0] : message)
        }
    })
}

export function useBulkImportHistory() {
    return useQuery({
        queryKey: ['bulk-import-history'],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/csv/bulk-import-history')
            const records = response?.data || response
            return Array.isArray(records) ? records : []
        },
        retry: false
    })
}
