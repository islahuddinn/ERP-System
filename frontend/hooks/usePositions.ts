import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'

export interface Position {
    id: string
    title: string
    description?: string | null
    _count?: { contracts: number }
    createdAt: string
    updatedAt: string
}

export interface PositionDropdownItem {
    id: string
    title: string
}

export interface PositionFilters {
    search?: string
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
}

export interface PositionMeta {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
}

export interface PositionsResponse {
    data: Position[]
    meta: PositionMeta | null
}

export interface PositionPayload {
    title: string
    description?: string | null
}

export function usePositions(filters: PositionFilters = {}) {
    return useQuery({
        queryKey: ['positions', filters],
        queryFn: async (): Promise<PositionsResponse> => {
            const { data: response } = await apiClient.get('/hr/positions', { params: filters })
            return {
                data: response?.data ?? (Array.isArray(response) ? response : []),
                meta: response?.meta ?? null,
            }
        },
        placeholderData: keepPreviousData,
    })
}

export function usePosition(id: string) {
    return useQuery({
        queryKey: ['positions', id],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/hr/positions/${id}`)
            return (response?.data || response) as Position
        },
        enabled: !!id,
    })
}

export function usePositionsDropdown() {
    return useQuery({
        queryKey: ['positions', 'dropdown'],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/hr/positions/dropdown')
            const responseData = response?.data || response
            return (Array.isArray(responseData) ? responseData : []) as PositionDropdownItem[]
        },
        // Positions can be added, renamed or deleted elsewhere; always refetch on
        // mount so the contract create/edit dropdowns reflect the latest set rather
        // than a stale cached list.
        staleTime: 0,
        refetchOnMount: 'always',
    })
}

export function useCreatePosition() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (data: PositionPayload) => {
            const { data: response } = await apiClient.post('/hr/positions', data)
            return response?.data || response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['positions'] })
            toast.success('Position created successfully')
        },
    })
}

export function useUpdatePosition() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<PositionPayload> }) => {
            const { data: response } = await apiClient.patch(`/hr/positions/${id}`, data)
            return response?.data || response
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['positions'] })
            queryClient.invalidateQueries({ queryKey: ['positions', variables.id] })
            queryClient.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'Position', variables.id] })
            toast.success('Position updated successfully')
        },
    })
}

export function useDeletePosition() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/hr/positions/${id}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['positions'] })
            toast.success('Position deleted successfully')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to delete position'))
        },
    })
}
