import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'

export type BomStatus = 'DRAFT' | 'ACTIVE' | 'INACTIVE'

export interface BomItem {
    id: string
    bomId: string
    rawMaterialId: string
    rawMaterial: { id: string; name: string; code: string; uom: { id: string; name: string; symbol: string } } | null
    uomId: string
    uom: { id: string; name: string; symbol: string } | null
    quantityPerUnit: number
    wastagePercent: number
    notes: string | null
    createdAt: string
    updatedAt: string
}

export interface Bom {
    id: string
    bomNumber: string
    name: string
    description: string | null
    productId: string
    product: { id: string; name: string; code: string } | null
    status: BomStatus
    items: BomItem[]
    createdById: string
    updatedById: string | null
    deletedAt: string | null
    createdAt: string
    updatedAt: string
}

export interface BomFilters {
    page?: number
    limit?: number
    search?: string
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
    status?: BomStatus
    productId?: string
    startDate?: string
    endDate?: string
}

export interface CreateBomItemDto {
    rawMaterialId: string
    uomId: string
    quantityPerUnit: number
    wastagePercent?: number
    notes?: string
}

export interface CreateBomDto {
    productId: string
    name: string
    description?: string
    items: CreateBomItemDto[]
}

export interface UpdateBomDto {
    name?: string
    description?: string | null
    items?: CreateBomItemDto[]
}

export interface UpdateBomStatusDto {
    status: 'ACTIVE' | 'INACTIVE'
}

const extract = (response: any) => response?.data?.data ?? response?.data ?? response

export function useBoms(filters: BomFilters = {}) {
    return useQuery({
        queryKey: ['boms', filters],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/bom', { params: filters })
            const payload = extract(response)
            if (payload && Array.isArray(payload.data)) return payload
            if (Array.isArray(payload)) {
                return {
                    data: payload as Bom[],
                    meta: response?.meta ?? {
                        total: payload.length,
                        page: filters.page || 1,
                        limit: filters.limit || payload.length,
                        totalPages: 1,
                    },
                }
            }
            return payload
        },
        placeholderData: keepPreviousData,
    })
}

export function useBom(bomId: string) {
    return useQuery({
        queryKey: ['boms', bomId],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/bom/${bomId}`)
            return extract(response) as Bom
        },
        enabled: !!bomId,
    })
}

export function useActiveBomForProduct(productId: string) {
    return useQuery({
        queryKey: ['boms', 'active', productId],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/bom/product/${productId}/active`)
            return extract(response) as Bom | null
        },
        enabled: !!productId,
    })
}

export function useCreateBom() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (dto: CreateBomDto) => {
            const { data: response } = await apiClient.post('/bom', dto)
            return extract(response) as Bom
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['boms'] })
            toast.success('BOM created successfully')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create BOM')
        },
    })
}

export function useUpdateBom() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ bomId, dto }: { bomId: string; dto: UpdateBomDto }) => {
            const { data: response } = await apiClient.patch(`/bom/${bomId}`, dto)
            return extract(response) as Bom
        },
        onSuccess: (_, { bomId }) => {
            queryClient.invalidateQueries({ queryKey: ['boms'] })
            queryClient.invalidateQueries({ queryKey: ['boms', bomId] })
            toast.success('BOM updated successfully')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update BOM')
        },
    })
}

export function useUpdateBomStatus() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ bomId, dto }: { bomId: string; dto: UpdateBomStatusDto }) => {
            const { data: response } = await apiClient.patch(`/bom/${bomId}/status`, dto)
            return extract(response) as Bom
        },
        onSuccess: (_, { bomId }) => {
            queryClient.invalidateQueries({ queryKey: ['boms'] })
            queryClient.invalidateQueries({ queryKey: ['boms', bomId] })
            toast.success('BOM status updated')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update BOM status')
        },
    })
}

export function useDeleteBom() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (bomId: string) => {
            const { data: response } = await apiClient.delete(`/bom/${bomId}`)
            return response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['boms'] })
            toast.success('BOM deleted successfully')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to delete BOM')
        },
    })
}
