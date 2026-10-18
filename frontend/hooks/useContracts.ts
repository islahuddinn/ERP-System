import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'

export type ContractType =
    | 'PERMANENT'
    | 'FIXED_TERM'
    | 'PROBATION'
    | 'INTERNSHIP'
    | 'PART_TIME'
    | 'CONTRACTOR'

export type ContractStatus = 'DRAFT' | 'ACTIVE' | 'EXPIRED' | 'TERMINATED' | 'SUPERSEDED'

export type SalaryFrequency = 'MONTHLY' | 'WEEKLY' | 'BIWEEKLY' | 'DAILY' | 'HOURLY'

export type SalaryRevisionStatus = 'DRAFT' | 'CURRENT' | 'SUPERSEDED' | 'SUSPENDED'

export type AllowanceType =
    | 'HOUSE_RENT'
    | 'MEDICAL'
    | 'TRANSPORT'
    | 'FUEL'
    | 'GYM'
    | 'MOBILE'
    | 'OTHER'

export interface SalaryRevision {
    id: string
    contractId: string
    effectiveDate: string
    baseSalary: number | string
    currency: string
    salaryFrequency: SalaryFrequency
    status: SalaryRevisionStatus
    reason?: string | null
    createdById?: string | null
    createdAt: string
    createdBy?: { id: string; firstName: string; lastName: string } | null
}

export interface ContractAllowance {
    id: string
    contractId: string
    allowanceType: AllowanceType
    amount: number | string
    createdById?: string | null
    createdAt: string
    updatedAt: string
}

export interface ContractEmployee {
    id: string
    userId: string | null
    employeeCode: string
    status: string
    user: { id: string; firstName: string; lastName: string; email: string | null; phone?: string | null } | null
}

export interface Contract {
    id: string
    employeeId: string
    positionId: string | null
    departmentId: string | null
    contractType: ContractType
    status: ContractStatus
    startDate: string
    endDate: string
    probationEndDate: string | null
    totalLeaves: number | string
    // Denormalized copy of the CURRENT salary revision's base salary — set on
    // create and kept in sync on revision activation. Lets the list show/sort a
    // salary even for a DRAFT contract that has no CURRENT revision yet (#5).
    currentSalary: number | string | null
    consumedLeaves: number | string
    notes: string | null
    createdById?: string | null
    createdAt: string
    updatedAt: string
    employee: ContractEmployee
    position: { id: string; title: string } | null
    department: { id: string; name: string } | null
    // List: only the CURRENT revision (max 1). Detail: full history ordered latest first.
    salaryRevisions: SalaryRevision[]
    allowances?: ContractAllowance[]
}

export interface ContractFilters {
    employeeId?: string
    status?: ContractStatus
    contractType?: ContractType
    departmentId?: string
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
}

export interface ContractMeta {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
}

export interface ContractsResponse {
    data: Contract[]
    meta: ContractMeta | null
}

export interface SalaryPayload {
    baseSalary: string
    currency?: string
    salaryFrequency?: SalaryFrequency
    effectiveDate?: string
    reason?: string
}

export interface CreateContractPayload {
    employeeId: string
    positionId?: string | null
    departmentId?: string | null
    contractType: ContractType
    startDate: string
    endDate: string
    probationEndDate?: string | null
    totalLeaves: number
    salary: SalaryPayload
    notes?: string | null
}

export interface UpdateContractPayload {
    positionId?: string | null
    departmentId?: string | null
    startDate?: string
    endDate?: string
    probationEndDate?: string | null
    totalLeaves?: number
    notes?: string | null
}

export interface CreateAllowancePayload {
    allowanceType: AllowanceType
    amount: string
}

export interface UpdateAllowancePayload {
    amount: string
}

// ── Contracts ─────────────────────────────────────────────────────────────

export function useContracts(filters: ContractFilters = {}) {
    return useQuery({
        queryKey: ['contracts', filters],
        queryFn: async (): Promise<ContractsResponse> => {
            const { data: response } = await apiClient.get('/hr/contracts', { params: filters })
            return {
                data: response?.data ?? (Array.isArray(response) ? response : []),
                meta: response?.meta ?? null,
            }
        },
        placeholderData: keepPreviousData,
        // Employee names, department names and salaries can change in their own
        // modules; always refetch on mount so the list reflects the latest values
        // (and a newly created contract's current salary) without a manual refresh.
        staleTime: 0,
        refetchOnMount: 'always',
    })
}

export function useContract(id: string) {
    return useQuery({
        queryKey: ['contracts', id],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/hr/contracts/${id}`)
            return (response?.data || response) as Contract
        },
        enabled: !!id,
        // Always refetch on mount so updated employee/department/position values
        // (and salary) are reflected on the contract detail screen (#19).
        staleTime: 0,
        refetchOnMount: 'always',
    })
}

export function useCreateContract() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (data: CreateContractPayload) => {
            const { data: response } = await apiClient.post('/hr/contracts', data)
            return response?.data || response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contracts'] })
            toast.success('Contract created successfully')
        },
    })
}

export function useUpdateContract() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateContractPayload }) => {
            const { data: response } = await apiClient.patch(`/hr/contracts/${id}`, data)
            return response?.data || response
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['contracts'] })
            queryClient.invalidateQueries({ queryKey: ['contracts', variables.id] })
            queryClient.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'EmployeeContract', variables.id] })
            toast.success('Contract updated successfully')
        },
    })
}

export function useActivateContract() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const { data: response } = await apiClient.patch(`/hr/contracts/${id}/activate`)
            return response?.data || response
        },
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['contracts'] })
            queryClient.invalidateQueries({ queryKey: ['contracts', id] })
            toast.success('Contract activated')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to activate contract'))
        },
    })
}

export function useTerminateContract() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, notes }: { id: string; notes?: string }) => {
            const { data: response } = await apiClient.patch(`/hr/contracts/${id}/terminate`, { notes })
            return response?.data || response
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['contracts'] })
            queryClient.invalidateQueries({ queryKey: ['contracts', variables.id] })
            toast.success('Contract terminated')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to terminate contract'))
        },
    })
}

// ── Allowances ────────────────────────────────────────────────────────────

export function useContractAllowances(contractId: string) {
    return useQuery({
        queryKey: ['contracts', contractId, 'allowances'],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/hr/contracts/${contractId}/allowances`)
            const responseData = response?.data || response
            return (Array.isArray(responseData) ? responseData : []) as ContractAllowance[]
        },
        enabled: !!contractId,
    })
}

export function useCreateAllowance() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ contractId, data }: { contractId: string; data: CreateAllowancePayload }) => {
            const { data: response } = await apiClient.post(`/hr/contracts/${contractId}/allowances`, data)
            return response?.data || response
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['contracts', variables.contractId, 'allowances'] })
            queryClient.invalidateQueries({ queryKey: ['contracts', variables.contractId] })
            toast.success('Allowance added')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to add allowance'))
        },
    })
}

export function useUpdateAllowance() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({
            contractId,
            allowanceId,
            data,
        }: {
            contractId: string
            allowanceId: string
            data: UpdateAllowancePayload
        }) => {
            const { data: response } = await apiClient.patch(
                `/hr/contracts/${contractId}/allowances/${allowanceId}`,
                data,
            )
            return response?.data || response
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['contracts', variables.contractId, 'allowances'] })
            queryClient.invalidateQueries({ queryKey: ['contracts', variables.contractId] })
            toast.success('Allowance updated')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to update allowance'))
        },
    })
}

export function useDeleteAllowance() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ contractId, allowanceId }: { contractId: string; allowanceId: string }) => {
            await apiClient.delete(`/hr/contracts/${contractId}/allowances/${allowanceId}`)
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['contracts', variables.contractId, 'allowances'] })
            queryClient.invalidateQueries({ queryKey: ['contracts', variables.contractId] })
            toast.success('Allowance removed')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to remove allowance'))
        },
    })
}

// ── Salary Revisions ──────────────────────────────────────────────────────

export function useSalaryRevisions(contractId: string) {
    return useQuery({
        queryKey: ['contracts', contractId, 'salary-revisions'],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/hr/contracts/${contractId}/salary-revisions`)
            const responseData = response?.data || response
            return (Array.isArray(responseData) ? responseData : []) as SalaryRevision[]
        },
        enabled: !!contractId,
    })
}

export function useCreateSalaryRevision() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ contractId, data }: { contractId: string; data: SalaryPayload }) => {
            const { data: response } = await apiClient.post(
                `/hr/contracts/${contractId}/salary-revisions`,
                data,
            )
            return response?.data || response
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['contracts', variables.contractId, 'salary-revisions'] })
            queryClient.invalidateQueries({ queryKey: ['contracts', variables.contractId] })
            toast.success('Salary revision added')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to add salary revision'))
        },
    })
}

export function useActivateSalaryRevision() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ contractId, revisionId }: { contractId: string; revisionId: string }) => {
            const { data: response } = await apiClient.patch(
                `/hr/contracts/${contractId}/salary-revisions/${revisionId}/activate`,
            )
            return response?.data || response
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['contracts', variables.contractId, 'salary-revisions'] })
            queryClient.invalidateQueries({ queryKey: ['contracts', variables.contractId] })
            toast.success('Salary revision activated')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to activate salary revision'))
        },
    })
}
