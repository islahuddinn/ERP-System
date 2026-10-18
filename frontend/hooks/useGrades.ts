import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'

/*
 * HR Core — Grades. Flat, non-paginated list under /hr/core/grades. Salary-band
 * columns are Decimal and come back as numbers; the create/update DTO expects
 * decimal *strings*, so payload band fields are typed as string.
 *
 * Live-verified against the backend (2026-07-12): list, get-by-id, create,
 * update (PATCH) and delete all work. DELETE is a hard delete (the record is
 * removed; a second delete 404s). The by-id response returns the grade's own
 * columns only — it does not currently embed an `employees` relation, so the
 * detail page's Employees tab renders empty until the backend adds that include.
 * Detail/edit pages still fall back to the list cache if by-id has not resolved.
 */

// A minimal employee reference for when the by-id detail embeds employees.
export interface GradeEmployeeRef {
    id: string
    employeeCode: string
    firstName: string
    lastName: string
}

export interface Grade {
    id: string
    name: string
    level: number
    salaryBandMin: number | string
    salaryBandMax: number | string
    employees?: GradeEmployeeRef[]
    createdAt: string
    updatedAt: string
    createdById: string | null
}

export interface GradePayload {
    name: string
    level: number
    salaryBandMin: string
    salaryBandMax: string
    // Accepted by the DTO but currently not persisted by the backend service.
    description?: string
}

export function useGrades() {
    return useQuery({
        queryKey: ['grades'],
        queryFn: async (): Promise<Grade[]> => {
            const { data: response } = await apiClient.get('/hr/core/grades')
            return (response?.data ?? []) as Grade[]
        },
    })
}

export function useGrade(id: string) {
    return useQuery({
        queryKey: ['grades', id],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/hr/core/grades/${id}`)
            return (response?.data ?? response) as Grade
        },
        enabled: !!id,
        retry: false,
    })
}

export function useCreateGrade() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: GradePayload) => {
            const { data: response } = await apiClient.post('/hr/core/grades', payload)
            return response?.data ?? response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['grades'] })
            toast.success('Grade created successfully')
        },
    })
}

export function useUpdateGrade() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: Partial<GradePayload> }) => {
            const { data: response } = await apiClient.patch(`/hr/core/grades/${id}`, payload)
            return response?.data ?? response
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['grades'] })
            queryClient.invalidateQueries({ queryKey: ['grades', variables.id] })
            queryClient.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'Grade', variables.id] })
            toast.success('Grade updated successfully')
        },
    })
}

export function useDeleteGrade() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/hr/core/grades/${id}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['grades'] })
            toast.success('Grade deleted successfully')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to delete grade'))
        },
    })
}
