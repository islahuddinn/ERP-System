import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'

/*
 * HR Core — Org Units. Hierarchical (self-referencing parent) config, similar to
 * Departments. Flat list at /hr/core/org-units, nested tree at
 * /hr/core/org-units/tree, and an employee-annotated chart at
 * /hr/core/org-units/org-chart.
 *
 * Live-verified against the backend (2026-07-12): list, get-by-id, create,
 * update (PATCH), delete, /tree and /org-chart all work. The by-id response
 * embeds a `children` array; /org-chart returns the nested tree with `employees`
 * arrays (currently empty until employees are assigned to units). Detail/edit
 * pages still fall back to the list cache if by-id has not resolved.
 */

export type OrgUnitType = 'COMPANY' | 'DIVISION' | 'DEPARTMENT' | 'TEAM' | 'UNIT'

export const ORG_UNIT_TYPES: OrgUnitType[] = ['COMPANY', 'DIVISION', 'DEPARTMENT', 'TEAM', 'UNIT']

export interface OrgUnitEmployeeRef {
    id: string
    employeeCode: string
    firstName: string
    lastName: string
}

export interface OrgUnit {
    id: string
    name: string
    type: OrgUnitType
    parentId: string | null
    children?: OrgUnit[]
    employees?: OrgUnitEmployeeRef[]
    createdAt: string
    updatedAt: string
    createdById: string | null
}

// A node in the /tree response — an OrgUnit with nested children.
export interface OrgUnitTreeNode extends OrgUnit {
    children: OrgUnitTreeNode[]
}

// A node in the /org-chart response — org units annotated with their employees.
export interface OrgChartEmployee {
    id: string
    employeeCode: string
    fullName: string
    positionTitle?: string | null
}

export interface OrgChartNode {
    id: string
    name: string
    type: string
    children: OrgChartNode[]
    employees: OrgChartEmployee[]
}

export interface OrgUnitPayload {
    name: string
    type: OrgUnitType
    parentId?: string | null
}

export function useOrgUnits() {
    return useQuery({
        queryKey: ['org-units'],
        queryFn: async (): Promise<OrgUnit[]> => {
            const { data: response } = await apiClient.get('/hr/core/org-units')
            return (response?.data ?? []) as OrgUnit[]
        },
    })
}

export function useOrgUnit(id: string) {
    return useQuery({
        queryKey: ['org-units', id],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/hr/core/org-units/${id}`)
            return (response?.data ?? response) as OrgUnit
        },
        enabled: !!id,
        retry: false,
    })
}

export function useOrgUnitTree() {
    return useQuery({
        queryKey: ['org-units', 'tree'],
        queryFn: async (): Promise<OrgUnitTreeNode[]> => {
            const { data: response } = await apiClient.get('/hr/core/org-units/tree')
            return (response?.data ?? []) as OrgUnitTreeNode[]
        },
    })
}

export function useOrgChart() {
    return useQuery({
        queryKey: ['org-units', 'org-chart'],
        queryFn: async (): Promise<OrgChartNode[]> => {
            const { data: response } = await apiClient.get('/hr/core/org-units/org-chart')
            return (response?.data ?? []) as OrgChartNode[]
        },
        retry: false,
    })
}

export function useCreateOrgUnit() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: OrgUnitPayload) => {
            const { data: response } = await apiClient.post('/hr/core/org-units', payload)
            return response?.data ?? response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['org-units'] })
            toast.success('Org unit created successfully')
        },
    })
}

export function useUpdateOrgUnit() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: Partial<OrgUnitPayload> }) => {
            const { data: response } = await apiClient.patch(`/hr/core/org-units/${id}`, payload)
            return response?.data ?? response
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['org-units'] })
            queryClient.invalidateQueries({ queryKey: ['org-units', variables.id] })
            queryClient.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'OrgUnit', variables.id] })
            toast.success('Org unit updated successfully')
        },
    })
}

export function useDeleteOrgUnit() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/hr/core/org-units/${id}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['org-units'] })
            toast.success('Org unit deleted successfully')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to delete org unit'))
        },
    })
}
