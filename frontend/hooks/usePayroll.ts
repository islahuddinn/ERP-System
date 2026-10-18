import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'

export type PayrollStatus = 'DRAFT' | 'APPROVED' | 'PAID'

// The minimal employee shape embedded on every payroll (PAYROLL_INCLUDE on the backend).
export interface PayrollEmployeeRef {
    id: string
    employeeCode: string
    user: { id: string; firstName: string; lastName: string; email: string } | null
}

/**
 * Money fields are Prisma Decimals serialized as strings — always Number() them
 * before math and render via useMoney(). Counts (days/minutes) are plain numbers.
 */
export interface Payroll {
    id: string
    employeeId: string
    periodStart: string
    periodEnd: string
    paidMonth: string // "YYYY-MM"

    // Salary structure
    grossSalary: string
    allowancesTotal: string
    bonusAmount: string
    bonusReason: string | null
    salaryPerDay: string
    salaryPerHour: string
    salaryPerMinute: string

    // Working-days breakdown
    totalCalendarDays: number
    holidays: number
    weekends: number
    paidLeaveDays: string
    unpaidLeaveDays: string
    workingDays: string

    // Attendance + deductions
    presentDays: string
    absentDays: number
    absentDaysDeduction: string
    timingMinutes: number
    timingDeduction: string
    unpaidLeaveDeduction: string
    loanDeduction: string

    // Totals
    totalDeductions: string
    netPay: string

    // Workflow
    status: PayrollStatus
    approvedById?: string | null
    approvedAt?: string | null
    paidAt?: string | null

    createdById: string
    createdAt: string
    updatedById: string
    updatedAt: string

    employee: PayrollEmployeeRef
}

// GET /hr/payroll/preview response — a pure calculation with no persisted id.
export interface PayrollPreview {
    grossSalary: string
    allowancesTotal: string
    salaryPerDay: string
    salaryPerHour: string
    salaryPerMinute: string
    totalCalendarDays: number
    holidays: number
    weekends: number
    paidLeaveDays: string
    unpaidLeaveDays: string
    workingDays: string
    presentDays: number
    absentDays: number
    timingMinutes: number
    absentDaysDeduction: string
    timingDeduction: string
    unpaidLeaveDeduction: string
    loanDeduction: string
    totalDeductions: string
    netPay: string
}

// POST /hr/payroll returns either a single created payroll, or a bulk summary.
export interface BulkPayrollResult {
    created: Array<{ payrollId: string; employeeId: string }>
    failed: Array<{ employeeId: string; reason: string }>
}

export function isBulkPayrollResult(result: Payroll | BulkPayrollResult): result is BulkPayrollResult {
    return (result as BulkPayrollResult).created !== undefined
}

export interface PayrollFilters {
    search?: string
    status?: PayrollStatus
    employeeId?: string
    paidMonth?: string
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
}

export interface PayrollMeta {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
}

export interface PayrollListResponse {
    data: Payroll[]
    meta: PayrollMeta | null
}

export interface PayrollPeriodPayload {
    employeeIds: string[]
    periodStart: string // "YYYY-MM-DD"
    periodEnd: string // "YYYY-MM-DD"
    paidMonth: string // "YYYY-MM"
}

export interface AddBonusPayload {
    bonusAmount: number
    bonusReason?: string
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

export function payrollEmployeeName(employee: PayrollEmployeeRef): string {
    const fullName = employee.user ? `${employee.user.firstName} ${employee.user.lastName}`.trim() : ''
    return fullName || employee.employeeCode
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

export function usePayrolls(filters: PayrollFilters = {}) {
    return useQuery({
        queryKey: ['payroll', filters],
        queryFn: async (): Promise<PayrollListResponse> => {
            const { data: response } = await apiClient.get('/hr/payroll', { params: filters })
            return {
                data: response?.data ?? (Array.isArray(response) ? response : []),
                meta: response?.meta ?? null,
            }
        },
        placeholderData: keepPreviousData,
    })
}

export function usePayroll(id: string) {
    return useQuery({
        queryKey: ['payroll', id],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/hr/payroll/${id}`)
            return (response?.data || response) as Payroll
        },
        enabled: !!id,
    })
}

// Preview is an on-demand calculation, so it's modelled as a mutation.
// Axios serializes employeeIds as `employeeIds[]=`, which the backend parses as an array.
export function usePayrollPreview() {
    return useMutation({
        mutationFn: async (payload: PayrollPeriodPayload) => {
            const { data: response } = await apiClient.get('/hr/payroll/preview', { params: payload })
            return (response?.data || response) as PayrollPreview
        },
    })
}

export function useCreatePayroll() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (payload: PayrollPeriodPayload) => {
            const { data: response } = await apiClient.post('/hr/payroll', payload)
            return (response?.data || response) as Payroll | BulkPayrollResult
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['payroll'] })
        },
    })
}

export function useAddBonus() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: AddBonusPayload }) => {
            const { data: response } = await apiClient.patch(`/hr/payroll/${id}/bonus`, data)
            return (response?.data || response) as Payroll
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['payroll'] })
            queryClient.invalidateQueries({ queryKey: ['payroll', variables.id] })
            queryClient.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'Payroll', variables.id] })
            toast.success('Bonus updated successfully')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to update bonus'))
        },
    })
}

export function useApprovePayroll() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const { data: response } = await apiClient.post(`/hr/payroll/${id}/approve`)
            return (response?.data || response) as Payroll
        },
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['payroll'] })
            queryClient.invalidateQueries({ queryKey: ['payroll', id] })
            queryClient.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'Payroll', id] })
            toast.success('Payroll approved successfully')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to approve payroll'))
        },
    })
}

export function usePayPayroll() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const { data: response } = await apiClient.post(`/hr/payroll/${id}/pay`)
            return (response?.data || response) as Payroll
        },
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['payroll'] })
            queryClient.invalidateQueries({ queryKey: ['payroll', id] })
            queryClient.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'Payroll', id] })
            toast.success('Payroll marked as paid')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to mark payroll as paid'))
        },
    })
}
