import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'
import type { RawMaterial } from '@/types/common'

export type { RawMaterial }

export interface RawMaterialFilters {
    search?: string
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
    uomId?: string
}

export function useRawMaterials(filters: RawMaterialFilters = {}) {
    return useQuery({
        queryKey: ['raw-materials', filters],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/raw-materials', { params: filters })
            return {
                data: response?.data ?? response ?? [],
                meta: response?.meta ?? null,
            }
        },
        placeholderData: keepPreviousData,
    })
}

export function useRawMaterial(id: string) {
    return useQuery({
        queryKey: ['raw-materials', id],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/raw-materials/${id}`)
            return (response?.data || response) as RawMaterial
        },
        enabled: !!id
    })
}

export function useRawMaterialsDropdown() {
    return useQuery({
        queryKey: ['raw-materials', 'dropdown'],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/raw-materials/dropdown')
            const responseData = response?.data || response
            return (Array.isArray(responseData) ? responseData : []) as {
                id: string; name: string; code: string;
                lastPurchasePrice?: number | null;
                uom?: { id: string; name: string; symbol: string }
            }[]
        },
        // QA #14: ensure filter options reflect raw-material add/edit/delete
        // when navigating back to the batches list (no manual refresh needed).
        staleTime: 0,
        refetchOnMount: 'always',
    })
}

export function useCreateRawMaterial() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (data: {
            name: string
            code: string
            uomId: string
            description?: string
            currentStock?: number
            reorderLevel?: number
            lastPurchasePrice?: number
        }) => {
            const { data: response } = await apiClient.post('/raw-materials', data)
            return response?.data || response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['raw-materials'] })
            toast.success('Raw material created')
        },
        onError: (err: any) => {
            // Surface the API's real validation message (e.g. the code-length rule).
            // NestJS returns validation errors as message: string[]; getApiErrorMessage
            // joins them instead of dumping "[object Object]"/a generic string. — QA #6
            toast.error(getApiErrorMessage(err, 'Failed to create raw material'))
        }
    })
}

export function useUpdateRawMaterial() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data }: {
            id: string
            data: Partial<{
                name: string; code: string; uomId: string; description: string | null;
                reorderLevel: number; lastPurchasePrice: number | null
            }>
        }) => {
            const { data: response } = await apiClient.patch(`/raw-materials/${id}`, data)
            return response?.data || response
        },
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['raw-materials'] })
            queryClient.invalidateQueries({ queryKey: ['raw-materials', id] })
            toast.success('Raw material updated')
        },
        onError: (err: any) => {
            toast.error(getApiErrorMessage(err, 'Failed to update raw material'))
        }
    })
}

export function useDeleteRawMaterial() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/raw-materials/${id}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['raw-materials'] })
            toast.success('Raw material deleted')
        }
    })
}

