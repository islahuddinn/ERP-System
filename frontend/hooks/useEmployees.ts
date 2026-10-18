import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'

export type LoginAccess = 'ENABLED' | 'DISABLED' | 'SUSPENDED'
export type EmployeeStatus = 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'ONBOARDING'

// The User account linked to an employee (null for laborers with no system access).
export interface EmployeeUser {
    id: string
    firstName: string
    lastName: string
    email: string | null
    phone?: string | null
    loginAccess: LoginAccess
    role?: { id: string; name: string } | null
}

export interface EmployeeDocument {
    id: string
    employeeId: string
    documentType: string
    fileUrl: string
    uploadedAt: string
    createdAt: string
    updatedAt: string
    createdById?: string | null
}

export interface EmployeeShift {
    id: string
    name: string
    type: string
    startTime: string
    endTime: string
}

export interface Employee {
    id: string
    userId: string | null
    employeeCode: string
    dateOfJoining: string
    status: EmployeeStatus
    shiftId: string | null
    createdById?: string | null
    createdAt: string
    updatedAt: string
    user: EmployeeUser | null
    documents?: EmployeeDocument[]
    shift?: EmployeeShift | null
}

export interface EmployeeDropdownItem {
    id: string
    employeeCode: string
    user: { id: string; firstName: string; lastName: string } | null
}

// Roles come from the shared /roles/dropdown endpoint — needed to assign login access.
export interface RoleDropdownItem {
    id: string
    name: string
    isSystem: boolean
}

export interface EmployeeFilters {
    search?: string
    status?: EmployeeStatus
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
}

export interface EmployeeMeta {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
}

export interface EmployeesResponse {
    data: Employee[]
    meta: EmployeeMeta | null
}

export interface CreateEmployeePayload {
    firstName: string
    lastName: string
    email?: string | null
    phone?: string | null
    loginAccess: LoginAccess
    roleId?: string | null
    password?: string | null
    employeeCode: string
    dateOfJoining: string
    status?: EmployeeStatus
    shiftId?: string | null
}

export type UpdateEmployeePayload = Partial<CreateEmployeePayload>

export interface AttachDocumentPayload {
    documentType: string
    fileUrl: string
}

export function useEmployees(filters: EmployeeFilters = {}) {
    return useQuery({
        queryKey: ['employees', filters],
        queryFn: async (): Promise<EmployeesResponse> => {
            const { data: response } = await apiClient.get('/hr/employees', { params: filters })
            return {
                data: response?.data ?? (Array.isArray(response) ? response : []),
                meta: response?.meta ?? null,
            }
        },
        placeholderData: keepPreviousData,
    })
}

export function useEmployee(id: string) {
    return useQuery({
        queryKey: ['employees', id],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/hr/employees/${id}`)
            return (response?.data || response) as Employee
        },
        enabled: !!id,
        // Revisiting the details page must show the latest embedded shift/role, so
        // never serve a cached copy — always refetch on mount.
        staleTime: 0,
        refetchOnMount: 'always',
    })
}

// Builds a human label for an employee dropdown entry.
export function employeeLabel(employee: EmployeeDropdownItem): string {
    if (employee.user) {
        return `${employee.user.firstName} ${employee.user.lastName} (${employee.employeeCode})`
    }
    return employee.employeeCode
}

export function useEmployeesDropdown() {
    return useQuery({
        queryKey: ['employees', 'dropdown'],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/hr/employees/dropdown')
            const responseData = response?.data || response
            return (Array.isArray(responseData) ? responseData : []) as EmployeeDropdownItem[]
        },
        // Employees can be added or renamed elsewhere; always refetch on mount so the
        // dropdown reflects newly created and updated employees rather than a stale list.
        staleTime: 0,
        refetchOnMount: 'always',
    })
}

/** Branch distributor picker — all ACTIVE employees (login not required). */
export function useEmployeesDistributorDropdown() {
    return useQuery({
        queryKey: ['employees', 'dropdown', 'distributors'],
        queryFn: async (): Promise<EmployeeDropdownItem[]> => {
            const endpoints = [
                '/sales-management/branches/distributor-options',
                '/hr/employees/dropdown/distributors',
            ]

            for (const endpoint of endpoints) {
                try {
                    const { data: response } = await apiClient.get(endpoint)
                    const responseData = response?.data ?? response
                    if (Array.isArray(responseData)) {
                        return responseData as EmployeeDropdownItem[]
                    }
                } catch {
                    // Try next endpoint (e.g. before backend restart)
                }
            }

            try {
                const { data: response } = await apiClient.get('/hr/employees/dropdown')
                const responseData = response?.data ?? response
                if (Array.isArray(responseData) && responseData.length > 0) {
                    return responseData as EmployeeDropdownItem[]
                }
            } catch {
                // fall through to full list
            }

            const { data: response } = await apiClient.get('/hr/employees', {
                params: { status: 'ACTIVE', limit: 100 },
            })
            const rows = (response?.data ?? []) as Employee[]
            return rows.map((employee) => ({
                id: employee.id,
                employeeCode: employee.employeeCode,
                user: employee.user
                    ? {
                          id: employee.user.id,
                          firstName: employee.user.firstName,
                          lastName: employee.user.lastName,
                      }
                    : null,
            }))
        },
        staleTime: 0,
        refetchOnMount: 'always',
    })
}

export function useRolesDropdown() {
    return useQuery({
        queryKey: ['roles', 'dropdown'],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/roles/dropdown')
            const responseData = response?.data || response
            return (Array.isArray(responseData) ? responseData : []) as RoleDropdownItem[]
        },
        // Roles can be renamed elsewhere; always refetch so the Add/Edit Employee
        // dropdown reflects the current role names rather than a cached list.
        staleTime: 0,
        refetchOnMount: 'always',
    })
}

export function useCreateEmployee() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (data: CreateEmployeePayload) => {
            const { data: response } = await apiClient.post('/hr/employees', data)
            return response?.data || response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['employees'] })
            toast.success('Employee created successfully')
        },
    })
}

export function useUpdateEmployee() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateEmployeePayload }) => {
            const { data: response } = await apiClient.patch(`/hr/employees/${id}`, data)
            return response?.data || response
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['employees'] })
            queryClient.invalidateQueries({ queryKey: ['employees', variables.id] })
            queryClient.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'Employee', variables.id] })
            toast.success('Employee updated successfully')
        },
    })
}

export function useAttachEmployeeDocument() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: AttachDocumentPayload }) => {
            const { data: response } = await apiClient.post(`/hr/employees/${id}/documents`, data)
            return response?.data || response
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['employees', variables.id] })
            toast.success('Document attached successfully')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to attach document'))
        },
    })
}
