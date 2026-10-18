import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'

export type HolidayType = 'FULL_DAY' | 'HALF_DAY'

export const HOLIDAY_TYPE_LABELS: Record<HolidayType, string> = {
    FULL_DAY: 'Full day',
    HALF_DAY: 'Half day',
}

export interface Holiday {
    id: string
    name: string
    description: string | null
    type: HolidayType
    startDate: string   // ISO datetime
    endDate: string     // ISO datetime
    // Individual non-weekend dates covered by the holiday (YYYY-MM-DD) — only
    // populated by the API for FULL_DAY holidays that span multiple days.
    dates?: string[]
    createdAt: string
    updatedAt: string
}

export interface HolidayFilters {
    search?: string
    type?: HolidayType
    year?: number
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
}

export interface HolidayMeta {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
}

export interface HolidaysResponse {
    data: Holiday[]
    meta: HolidayMeta | null
}

export interface HolidayPayload {
    name: string
    description?: string | null
    type?: HolidayType
    startDate: string   // "YYYY-MM-DD"
    endDate?: string    // "YYYY-MM-DD" — required for FULL_DAY, ignored for HALF_DAY
}

export function useHolidays(filters: HolidayFilters = {}) {
    return useQuery({
        queryKey: ['holidays', filters],
        queryFn: async (): Promise<HolidaysResponse> => {
            const { data: response } = await apiClient.get('/hr/holidays', { params: filters })
            return {
                data: response?.data ?? (Array.isArray(response) ? response : []),
                meta: response?.meta ?? null,
            }
        },
        placeholderData: keepPreviousData,
    })
}

export function useHoliday(id: string) {
    return useQuery({
        queryKey: ['holidays', id],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/hr/holidays/${id}`)
            return (response?.data || response) as Holiday
        },
        enabled: !!id,
    })
}

export function useCreateHoliday() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (data: HolidayPayload) => {
            const { data: response } = await apiClient.post('/hr/holidays', data)
            return response?.data || response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['holidays'] })
            toast.success('Holiday created successfully')
        },
    })
}

export function useUpdateHoliday() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<HolidayPayload> }) => {
            const { data: response } = await apiClient.patch(`/hr/holidays/${id}`, data)
            return response?.data || response
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['holidays'] })
            queryClient.invalidateQueries({ queryKey: ['holidays', variables.id] })
            queryClient.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'Holiday', variables.id] })
            toast.success('Holiday updated successfully')
        },
    })
}

export function useDeleteHoliday() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/hr/holidays/${id}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['holidays'] })
            toast.success('Holiday deleted successfully')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to delete holiday'))
        },
    })
}
