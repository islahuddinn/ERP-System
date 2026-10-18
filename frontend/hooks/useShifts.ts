import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'

export type ShiftType = 'FIXED' | 'FLEXIBLE'

export interface Shift {
    id: string
    name: string
    description?: string | null
    type: ShiftType
    startTime: string   // "HH:MM" 24-hour
    endTime: string     // "HH:MM" 24-hour
    crossesMidnight: boolean
    // Nullable so the list column can distinguish "no grace period set" from
    // a genuine, explicit 0 (#13).
    graceMinutes: number | null
    _count?: { employees: number }
    createdAt: string
    updatedAt: string
}

export interface ShiftDropdownItem {
    id: string
    name: string
    type: ShiftType
}

export interface ShiftFilters {
    search?: string
    type?: ShiftType
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
}

export interface ShiftMeta {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
}

export interface ShiftsResponse {
    data: Shift[]
    meta: ShiftMeta | null
}

export interface ShiftPayload {
    name: string
    description?: string | null
    type: ShiftType
    startTime: string
    endTime: string
    crossesMidnight?: boolean
    // null clears a previously-set grace period, distinct from an explicit 0 (#13)
    graceMinutes?: number | null
}

export function useShifts(filters: ShiftFilters = {}) {
    return useQuery({
        queryKey: ['shifts', filters],
        queryFn: async (): Promise<ShiftsResponse> => {
            const { data: response } = await apiClient.get('/hr/shifts', { params: filters })
            return {
                data: response?.data ?? (Array.isArray(response) ? response : []),
                meta: response?.meta ?? null,
            }
        },
        placeholderData: keepPreviousData,
    })
}

export function useShift(id: string) {
    return useQuery({
        queryKey: ['shifts', id],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/hr/shifts/${id}`)
            return (response?.data || response) as Shift
        },
        enabled: !!id,
    })
}

export function useShiftsDropdown() {
    return useQuery({
        queryKey: ['shifts', 'dropdown'],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/hr/shifts/dropdown')
            const responseData = response?.data || response
            return (Array.isArray(responseData) ? responseData : []) as ShiftDropdownItem[]
        },
    })
}

export function useCreateShift() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (data: ShiftPayload) => {
            const { data: response } = await apiClient.post('/hr/shifts', data)
            return response?.data || response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] })
            toast.success('Shift created successfully')
        },
    })
}

export function useUpdateShift() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<ShiftPayload> }) => {
            const { data: response } = await apiClient.patch(`/hr/shifts/${id}`, data)
            return response?.data || response
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] })
            queryClient.invalidateQueries({ queryKey: ['shifts', variables.id] })
            queryClient.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'Shift', variables.id] })
            toast.success('Shift updated successfully')
        },
    })
}

export function useDeleteShift() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/hr/shifts/${id}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['shifts'] })
            toast.success('Shift deleted successfully')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to delete shift'))
        },
    })
}
