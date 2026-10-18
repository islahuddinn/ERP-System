import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'

export type LoanRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED'
export type LoanApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type LoanInstallmentStatus = 'PENDING' | 'PAID'
export type LoanRepaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'FULLY_PAID'

export interface LoanUserRef {
    id: string
    firstName: string
    lastName: string
    email: string
}

export interface LoanEmployeeRef {
    id: string
    employeeCode: string
    user: { id: string; firstName: string; lastName: string } | null
}

export interface LoanApproval {
    id: string
    loanRequestId: string
    approverId: string
    status: LoanApprovalStatus
    remarks: string | null
    decidedAt: string | null
    createdAt: string
    updatedAt: string
    approver: LoanUserRef | null
}

// amount is serialized to a plain number by the backend (not a Decimal string).
export interface LoanInstallment {
    id: string
    loanRequestId: string
    installmentNumber: number
    amount: number
    returnMonth: string // "YYYY-MM"
    status: LoanInstallmentStatus
    paidAt: string | null
    createdAt: string
    updatedAt: string
}

/**
 * totalAmount / paidAmount / remainingAmount / installment amounts are serialized
 * to plain numbers by the backend. repaymentStatus is derived (never stored).
 */
export interface LoanRequest {
    id: string
    employeeId: string
    description: string | null
    totalAmount: number
    totalInstallments: number
    paidAmount: number
    remainingAmount: number
    repaymentStatus: LoanRepaymentStatus
    status: LoanRequestStatus
    createdAt: string
    updatedAt: string
    createdById: string | null
    employee: LoanEmployeeRef
    approvals: LoanApproval[]
    installments: LoanInstallment[]
    createdBy: LoanUserRef | null
}

export interface LoanRequestFilters {
    status?: LoanRequestStatus
    employeeId?: string
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
}

export interface LoanRequestMeta {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
}

export interface LoanRequestListResponse {
    data: LoanRequest[]
    meta: LoanRequestMeta | null
}

export interface CreateLoanRequestPayload {
    employeeId: string
    description?: string | null
    totalAmount: number
    totalInstallments: number
    approverIds: string[]
}

export type UpdateLoanRequestPayload = Partial<Omit<CreateLoanRequestPayload, 'employeeId'>>

export interface DecideApprovalPayload {
    decision: LoanApprovalStatus
    remarks?: string
}

// Minimal ACTIVE-employee list for the create form (GET /hr/employees/dropdown).
export interface HrEmployeeOption {
    id: string
    employeeCode: string
    user: { id: string; firstName: string; lastName: string } | null
}

export function employeeOptionLabel(option: HrEmployeeOption): string {
    const fullName = option.user ? `${option.user.firstName} ${option.user.lastName}`.trim() : ''
    return fullName ? `${fullName} (${option.employeeCode})` : option.employeeCode
}

export function loanEmployeeName(employee: LoanEmployeeRef): string {
    const fullName = employee.user ? `${employee.user.firstName} ${employee.user.lastName}`.trim() : ''
    return fullName || employee.employeeCode
}

export function userDisplayName(user: LoanUserRef | null): string {
    if (!user) return '—'
    return `${user.firstName} ${user.lastName}`.trim() || user.email
}

export function useHrEmployeesDropdown() {
    return useQuery({
        queryKey: ['hr-employees', 'dropdown'],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/hr/employees/dropdown')
            const responseData = response?.data || response
            return (Array.isArray(responseData) ? responseData : []) as HrEmployeeOption[]
        },
        staleTime: 5 * 60 * 1000,
    })
}

export function useLoanRequests(filters: LoanRequestFilters = {}) {
    return useQuery({
        queryKey: ['loan-requests', filters],
        queryFn: async (): Promise<LoanRequestListResponse> => {
            const { data: response } = await apiClient.get('/hr/loan-requests', { params: filters })
            return {
                data: response?.data ?? (Array.isArray(response) ? response : []),
                meta: response?.meta ?? null,
            }
        },
        placeholderData: keepPreviousData,
    })
}

export function useLoanRequest(id: string) {
    return useQuery({
        queryKey: ['loan-requests', id],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/hr/loan-requests/${id}`)
            return (response?.data || response) as LoanRequest
        },
        enabled: !!id,
    })
}

export function useCreateLoanRequest() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: CreateLoanRequestPayload) => {
            const { data: response } = await apiClient.post('/hr/loan-requests', payload)
            return (response?.data || response) as LoanRequest
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
            toast.success('Loan request created successfully')
        },
    })
}

export function useUpdateLoanRequest() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateLoanRequestPayload }) => {
            const { data: response } = await apiClient.patch(`/hr/loan-requests/${id}`, data)
            return (response?.data || response) as LoanRequest
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
            queryClient.invalidateQueries({ queryKey: ['loan-requests', variables.id] })
            queryClient.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'LoanRequest', variables.id] })
            toast.success('Loan request updated successfully')
        },
    })
}

export function useDeleteLoanRequest() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/hr/loan-requests/${id}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
            toast.success('Loan request deleted successfully')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to delete loan request'))
        },
    })
}

export function useDecideLoanApproval() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: DecideApprovalPayload }) => {
            const { data: response } = await apiClient.post(`/hr/loan-requests/${id}/approve`, data)
            return (response?.data || response) as LoanRequest
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
            queryClient.invalidateQueries({ queryKey: ['loan-requests', variables.id] })
            queryClient.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'LoanRequest', variables.id] })
            toast.success('Approval decision recorded')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to record approval decision'))
        },
    })
}

export function usePayInstallment() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, installmentId }: { id: string; installmentId: string }) => {
            const { data: response } = await apiClient.post(
                `/hr/loan-requests/${id}/installments/${installmentId}/pay`,
            )
            return (response?.data || response) as LoanRequest
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['loan-requests'] })
            queryClient.invalidateQueries({ queryKey: ['loan-requests', variables.id] })
            queryClient.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'LoanRequest', variables.id] })
            toast.success('Installment marked as paid')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to mark installment as paid'))
        },
    })
}
