import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'

export type WeekDay =
    | 'SUNDAY'
    | 'MONDAY'
    | 'TUESDAY'
    | 'WEDNESDAY'
    | 'THURSDAY'
    | 'FRIDAY'
    | 'SATURDAY'

export const WEEK_DAYS: WeekDay[] = [
    'SUNDAY',
    'MONDAY',
    'TUESDAY',
    'WEDNESDAY',
    'THURSDAY',
    'FRIDAY',
    'SATURDAY',
]

export interface HrSettings {
    id: string
    weeklyOffDays: WeekDay[]
    timezone: string | null
    currency: string | null
    settings: Record<string, unknown>
    maxLoanInstallmentPercent: number
    createdAt: string
    updatedAt: string
}

export interface UpdateHrSettingsPayload {
    weeklyOffDays?: WeekDay[]
    timezone?: string | null
    currency?: string | null
    settings?: Record<string, unknown>
    maxLoanInstallmentPercent?: number
}

// GET /hr/settings — the backend lazily creates the singleton row if missing.
export function useHrSettings() {
    return useQuery({
        queryKey: ['hr-settings'],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/hr/settings')
            return (response?.data || response) as HrSettings
        },
    })
}

// PATCH /hr/settings — partial update of the tenant's HR settings.
export function useUpdateHrSettings() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: UpdateHrSettingsPayload) => {
            const { data: response } = await apiClient.patch('/hr/settings', payload)
            return (response?.data || response) as HrSettings
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr-settings'] })
            queryClient.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'HrSettings'] })
            toast.success('HR settings updated successfully')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to update HR settings'))
        },
    })
}
