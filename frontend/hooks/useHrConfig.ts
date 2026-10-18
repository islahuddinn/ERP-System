import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'

/*
 * HR Config — four independent payroll-configuration sub-resources, each a flat
 * CRUD list under /hr/config. The backend returns plain (non-paginated) arrays
 * inside the standard { success, message, data } envelope. Decimal columns come
 * back as numbers; create/update DTOs expect decimal *strings* (@IsDecimal), so
 * payload decimal fields are typed as string.
 *
 * All four sub-resources (tax-rules, deduction-rules, working-calendars,
 * salary-components) are live-verified against the backend (2026-07-12): list,
 * create, update (PATCH) and delete all work. DELETE is a soft-delete that sets
 * isActive:false so payroll history stays intact.
 */

// ----------------------------------------------------------------------------
// Shared types
// ----------------------------------------------------------------------------
export type DeductionCalculationType = 'FIXED_AMOUNT' | 'PERCENTAGE' | 'FORMULA_BASED'
export type SalaryComponentType = 'EARNING' | 'DEDUCTION'

// ----------------------------------------------------------------------------
// Tax Rules
// ----------------------------------------------------------------------------
export interface TaxRule {
    id: string
    countryCode: string
    name: string
    slabMin: number | string
    slabMax: number | string | null
    ratePercent: number | string
    isActive: boolean
    effectiveFrom: string
    effectiveTo: string | null
    createdAt: string
    updatedAt: string
    createdById: string | null
}

export interface TaxRulePayload {
    countryCode: string
    name: string
    slabMin: string
    slabMax?: string | null
    ratePercent: string
    isActive?: boolean
    effectiveFrom: string
    effectiveTo?: string | null
}

export function useTaxRules() {
    return useQuery({
        queryKey: ['hr-config', 'tax-rules'],
        queryFn: async (): Promise<TaxRule[]> => {
            const { data: response } = await apiClient.get('/hr/config/tax-rules')
            return (response?.data ?? []) as TaxRule[]
        },
    })
}

export function useCreateTaxRule() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: TaxRulePayload) => {
            const { data: response } = await apiClient.post('/hr/config/tax-rules', payload)
            return response?.data ?? response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr-config', 'tax-rules'] })
            toast.success('Tax rule created successfully')
        },
    })
}

export function useUpdateTaxRule() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: Partial<TaxRulePayload> }) => {
            const { data: response } = await apiClient.patch(`/hr/config/tax-rules/${id}`, payload)
            return response?.data ?? response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr-config', 'tax-rules'] })
            toast.success('Tax rule updated successfully')
        },
    })
}

export function useDeleteTaxRule() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/hr/config/tax-rules/${id}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr-config', 'tax-rules'] })
            toast.success('Tax rule deactivated successfully')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to deactivate tax rule'))
        },
    })
}

// ----------------------------------------------------------------------------
// Deduction Rules
// ----------------------------------------------------------------------------
export interface DeductionRule {
    id: string
    code: string
    name: string
    description: string | null
    calculationType: DeductionCalculationType | string
    amount: number | string | null
    ratePercent: number | string | null
    formula: string | null
    isStatutory?: boolean
    isActive: boolean
    effectiveFrom?: string
    effectiveTo?: string | null
    createdAt: string
    updatedAt: string
    createdById: string | null
}

export interface DeductionRulePayload {
    code: string
    name: string
    description?: string | null
    calculationType: string
    amount?: string | null
    ratePercent?: string | null
    formula?: string | null
    isStatutory?: boolean
    isActive?: boolean
    effectiveFrom: string
    effectiveTo?: string | null
}

export function useDeductionRules() {
    return useQuery({
        queryKey: ['hr-config', 'deduction-rules'],
        queryFn: async (): Promise<DeductionRule[]> => {
            const { data: response } = await apiClient.get('/hr/config/deduction-rules')
            return (response?.data ?? []) as DeductionRule[]
        },
        retry: false,
    })
}

export function useCreateDeductionRule() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: DeductionRulePayload) => {
            const { data: response } = await apiClient.post('/hr/config/deduction-rules', payload)
            return response?.data ?? response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr-config', 'deduction-rules'] })
            toast.success('Deduction rule created successfully')
        },
    })
}

export function useUpdateDeductionRule() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: Partial<DeductionRulePayload> }) => {
            const { data: response } = await apiClient.patch(`/hr/config/deduction-rules/${id}`, payload)
            return response?.data ?? response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr-config', 'deduction-rules'] })
            toast.success('Deduction rule updated successfully')
        },
    })
}

export function useDeleteDeductionRule() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/hr/config/deduction-rules/${id}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr-config', 'deduction-rules'] })
            toast.success('Deduction rule deactivated successfully')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to deactivate deduction rule'))
        },
    })
}

// ----------------------------------------------------------------------------
// Working Calendars
// ----------------------------------------------------------------------------
export interface WorkingCalendar {
    id: string
    name: string
    year: number
    countryCode: string
    weekendDays: number[]
    holidays?: unknown | null
    isActive: boolean
    createdAt: string
    updatedAt: string
    createdById: string | null
    // Server-computed, read-only fields (recomputed on every read).
    // holidayDayCount / workingDays can be fractional (HALF_DAY holidays count 0.5).
    totalDays: number
    weekendDayCount: number
    holidayDayCount: number
    workingDays: number
}

export interface WorkingCalendarPayload {
    name: string
    year: number
    countryCode: string
    weekendDays: number[]
    isActive?: boolean
}

export function useWorkingCalendars() {
    return useQuery({
        queryKey: ['hr-config', 'working-calendars'],
        queryFn: async (): Promise<WorkingCalendar[]> => {
            const { data: response } = await apiClient.get('/hr/config/working-calendars')
            return (response?.data ?? []) as WorkingCalendar[]
        },
        retry: false,
    })
}

export function useCreateWorkingCalendar() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: WorkingCalendarPayload) => {
            const { data: response } = await apiClient.post('/hr/config/working-calendars', payload)
            return response?.data ?? response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr-config', 'working-calendars'] })
            toast.success('Working calendar created successfully')
        },
    })
}

export function useUpdateWorkingCalendar() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: Partial<WorkingCalendarPayload> }) => {
            const { data: response } = await apiClient.patch(`/hr/config/working-calendars/${id}`, payload)
            return response?.data ?? response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr-config', 'working-calendars'] })
            toast.success('Working calendar updated successfully')
        },
    })
}

export function useDeleteWorkingCalendar() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/hr/config/working-calendars/${id}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr-config', 'working-calendars'] })
            toast.success('Working calendar deactivated successfully')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to deactivate working calendar'))
        },
    })
}

// ----------------------------------------------------------------------------
// Salary Components
// ----------------------------------------------------------------------------
export interface SalaryComponent {
    id: string
    code: string
    name: string
    type: SalaryComponentType | string
    category: string | null
    calculationType: DeductionCalculationType | string
    amount: number | string | null
    percentage: number | string | null
    formula: string | null
    isTaxable: boolean
    isDefault: boolean
    isActive: boolean
    effectiveFrom: string
    effectiveTo: string | null
    createdAt: string
    updatedAt: string
    createdById: string | null
}

export interface SalaryComponentPayload {
    code: string
    name: string
    type: string
    category?: string | null
    calculationType: string
    amount?: string | null
    percentage?: string | null
    formula?: string | null
    isTaxable?: boolean
    isDefault?: boolean
    isActive?: boolean
    effectiveFrom: string
    effectiveTo?: string | null
}

export function useSalaryComponents() {
    return useQuery({
        queryKey: ['hr-config', 'salary-components'],
        queryFn: async (): Promise<SalaryComponent[]> => {
            const { data: response } = await apiClient.get('/hr/config/salary-components')
            return (response?.data ?? []) as SalaryComponent[]
        },
    })
}

export function useCreateSalaryComponent() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: SalaryComponentPayload) => {
            const { data: response } = await apiClient.post('/hr/config/salary-components', payload)
            return response?.data ?? response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr-config', 'salary-components'] })
            toast.success('Salary component created successfully')
        },
    })
}

export function useUpdateSalaryComponent() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: Partial<SalaryComponentPayload> }) => {
            const { data: response } = await apiClient.patch(`/hr/config/salary-components/${id}`, payload)
            return response?.data ?? response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr-config', 'salary-components'] })
            toast.success('Salary component updated successfully')
        },
    })
}

export function useDeleteSalaryComponent() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/hr/config/salary-components/${id}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['hr-config', 'salary-components'] })
            toast.success('Salary component deactivated successfully')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to deactivate salary component'))
        },
    })
}
