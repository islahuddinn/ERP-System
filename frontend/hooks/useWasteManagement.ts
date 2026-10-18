import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'

export type WasteType = 'PRODUCTION' | 'QUALITY_REJECT' | 'EXPIRY' | 'DAMAGE' | 'SPOILAGE' | 'OTHER'
export type WasteItemType = 'RAW_MATERIAL' | 'PRODUCT'
export type WasteStatus = 'PENDING' | 'DISPOSED' | 'RECYCLED' | 'REUSED'

export interface WasteRecord {
    id: string
    wasteNumber: string
    wasteType: WasteType
    itemType: WasteItemType
    productId: string | null
    rawMaterialId: string | null
    quantity: number
    cost: string | null
    reason: string
    remarks: string | null
    siteId: string | null
    status: WasteStatus
    resolvedAt: string | null
    createdById: string
    createdAt: string
    updatedAt: string
    deletedAt: string | null
    product: { id: string; name: string; code: string; uom: { id: string; name: string; symbol: string } } | null
    rawMaterial: { id: string; name: string; code: string; uom: { id: string; name: string; symbol: string } } | null
    site: { id: string; name: string; code: string } | null
}

export interface WasteFilters {
    page?: number
    limit?: number
    search?: string
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
    wasteType?: WasteType
    itemType?: WasteItemType
    status?: WasteStatus
    productId?: string
    rawMaterialId?: string
    siteId?: string
    startDate?: string
    endDate?: string
}

export interface CreateWasteDto {
    wasteNumber?: string
    wasteType: WasteType
    itemType: WasteItemType
    productId?: string
    rawMaterialId?: string
    quantity: number
    cost?: number
    reason: string
    remarks?: string
    siteId?: string
}

export interface UpdateWasteDto {
    wasteType?: WasteType
    status?: 'DISPOSED' | 'RECYCLED' | 'REUSED'
    reason?: string
    remarks?: string
    siteId?: string
}

const extract = (response: any) => response?.data?.data ?? response?.data ?? response

export function useWasteManagement(filters: WasteFilters = {}) {
    return useQuery({
        queryKey: ['waste-management', filters],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/waste-management', { params: filters })
            const payload = extract(response)
            if (payload && Array.isArray(payload.data)) return payload
            if (Array.isArray(payload)) {
                return {
                    data: payload,
                    meta: response?.meta ?? { total: payload.length, page: filters.page || 1, limit: filters.limit || payload.length, totalPages: 1 },
                }
            }
            return payload
        },
    })
}

export function useWasteRecord(wasteId: string) {
    return useQuery({
        queryKey: ['waste-management', wasteId],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/waste-management/${wasteId}`)
            return extract(response) as WasteRecord
        },
        enabled: !!wasteId,
    })
}

export function useCreateWaste() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (dto: CreateWasteDto) => {
            const { data: response } = await apiClient.post('/waste-management', dto)
            return extract(response) as WasteRecord
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['waste-management'] })
            toast.success('Waste record created successfully')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to create waste record')
        },
    })
}

export function useUpdateWaste() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ wasteId, dto }: { wasteId: string; dto: UpdateWasteDto }) => {
            const { data: response } = await apiClient.patch(`/waste-management/${wasteId}`, dto)
            return extract(response) as WasteRecord
        },
        onSuccess: (_, { wasteId }) => {
            queryClient.invalidateQueries({ queryKey: ['waste-management'] })
            queryClient.invalidateQueries({ queryKey: ['waste-management', wasteId] })
            toast.success('Waste record updated successfully')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to update waste record')
        },
    })
}

export function useDeleteWaste() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (wasteId: string) => {
            const { data: response } = await apiClient.delete(`/waste-management/${wasteId}`)
            return response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['waste-management'] })
            toast.success('Waste record deleted successfully')
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || 'Failed to delete waste record')
        },
    })
}
