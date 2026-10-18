import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'

export type LeaveDurationType = 'FULL_DAY' | 'HALF_DAY'
export type LeaveRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED'
export type LeaveApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export const LEAVE_DURATION_LABELS: Record<LeaveDurationType, string> = {
    FULL_DAY: 'Full day',
    HALF_DAY: 'Half day',
}

export const LEAVE_STATUS_LABELS: Record<LeaveRequestStatus, string> = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
}

export const LEAVE_APPROVAL_STATUS_LABELS: Record<LeaveApprovalStatus, string> = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
}

export interface LeaveUserRef {
    id: string
    firstName: string
    lastName: string
    email: string
}

export interface LeaveEmployeeRef {
    id: string
    employeeCode: string
    user: { id: string; firstName: string; lastName: string } | null
}

export interface LeaveApproval {
    id: string
    leaveRequestId: string
    approverId: string
    status: LeaveApprovalStatus
    remarks: string | null
    decidedAt: string | null
    createdAt: string
    updatedAt: string
    approver: LeaveUserRef | null
}

export interface LeaveRequest {
    id: string
    employeeId: string
    startDate: string   // ISO datetime
    endDate: string     // ISO datetime
    durationType: LeaveDurationType
    isPaid: boolean
    totalDays: number
    reason: string | null
    status: LeaveRequestStatus
    createdAt: string
    updatedAt: string
    createdById: string | null
    employee: LeaveEmployeeRef
    approvals: LeaveApproval[]
    createdBy: LeaveUserRef | null
}

// Active user entry from /users/dropdown (HR backend returns firstName/lastName/email).
export interface ApproverUser {
    id: string
    firstName: string
    lastName: string
    email: string
    roleId: string
}

export interface LeaveRequestFilters {
    employeeId?: string
    status?: LeaveRequestStatus
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
}

export interface LeaveRequestMeta {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
}

export interface LeaveRequestsResponse {
    data: LeaveRequest[]
    meta: LeaveRequestMeta | null
}

export interface CreateLeaveRequestPayload {
    employeeId: string
    startDate: string   // "YYYY-MM-DD"
    endDate?: string    // required for FULL_DAY, ignored for HALF_DAY
    durationType?: LeaveDurationType
    isPaid?: boolean
    reason?: string | null
    approverIds: string[]
}

export interface DecideApprovalPayload {
    decision: LeaveApprovalStatus
    remarks?: string | null
}

export function approverLabel(user: ApproverUser): string {
    return `${user.firstName} ${user.lastName} (${user.email})`
}

export function useLeaveRequests(filters: LeaveRequestFilters = {}) {
    return useQuery({
        queryKey: ['leave-requests', filters],
        queryFn: async (): Promise<LeaveRequestsResponse> => {
            const { data: response } = await apiClient.get('/hr/leave-requests', { params: filters })
            return {
                data: response?.data ?? (Array.isArray(response) ? response : []),
                meta: response?.meta ?? null,
            }
        },
        placeholderData: keepPreviousData,
    })
}

export function useLeaveRequest(id: string) {
    return useQuery({
        queryKey: ['leave-requests', id],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/hr/leave-requests/${id}`)
            return (response?.data || response) as LeaveRequest
        },
        enabled: !!id,
    })
}

// Active users usable as approvers. The HR /users/dropdown returns
// { id, firstName, lastName, email, roleId }.
export function useApproverUsersDropdown() {
    return useQuery({
        queryKey: ['users', 'approver-dropdown'],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/users/dropdown')
            const responseData = response?.data || response
            return (Array.isArray(responseData) ? responseData : []) as ApproverUser[]
        },
        staleTime: 5 * 60 * 1000,
    })
}

export function useCreateLeaveRequest() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (data: CreateLeaveRequestPayload) => {
            const { data: response } = await apiClient.post('/hr/leave-requests', data)
            return response?.data || response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
            toast.success('Leave request created successfully')
        },
    })
}

export function useDecideLeaveApproval() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: DecideApprovalPayload }) => {
            const { data: response } = await apiClient.post(`/hr/leave-requests/${id}/approve`, data)
            return response?.data || response
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
            queryClient.invalidateQueries({ queryKey: ['leave-requests', variables.id] })
            queryClient.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'LeaveRequest', variables.id] })
        },
    })
}

export function useDeleteLeaveRequest() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/hr/leave-requests/${id}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['leave-requests'] })
            toast.success('Leave request deleted successfully')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to delete leave request'))
        },
    })
}
