import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { getApiErrorMessage } from '@/lib/api-error'

export type WorkMode = 'ON_SITE' | 'WORK_FROM_HOME' | 'FIELD_VISIT'
export type AttendanceSource = 'MANUAL' | 'BIOMETRIC' | 'API'
export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE'

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
    ON_SITE: 'On-site',
    WORK_FROM_HOME: 'Work from home',
    FIELD_VISIT: 'Field visit',
}

export const ATTENDANCE_SOURCE_LABELS: Record<AttendanceSource, string> = {
    MANUAL: 'Manual',
    BIOMETRIC: 'Biometric',
    API: 'API',
}

export const ATTENDANCE_STATUS_LABELS: Record<AttendanceStatus, string> = {
    PRESENT: 'Present',
    ABSENT: 'Absent',
    LATE: 'Late',
    HALF_DAY: 'Half day',
    LEAVE: 'Leave',
}

// Minimal user summary embedded on the created/updated audit fields.
export interface AttendanceUser {
    id: string
    firstName: string
    lastName: string
}

export interface AttendanceEmployeeRef {
    id: string
    employeeCode: string
    user: { firstName: string; lastName: string } | null
}

export interface AttendanceShiftRef {
    id: string
    name: string
    type: 'FIXED' | 'FLEXIBLE'
    startTime: string
    endTime: string
    crossesMidnight: boolean
    graceMinutes: number | null
}

// List item — matches the /hr/attendance list response (no createdBy/updatedBy).
export interface Attendance {
    id: string
    employeeId: string
    shiftId: string | null
    date: string            // "YYYY-MM-DD"
    checkIn: string | null  // "HH:MM"
    checkOut: string | null // "HH:MM"
    workedMinutes: number | null
    lateMinutes: number
    earlyExitMinutes: number
    overtimeMinutes: number
    status: AttendanceStatus
    workMode: WorkMode
    source: AttendanceSource
    notes: string | null
    createdById: string | null
    updatedById: string | null
    createdAt: string
    updatedAt: string
    employee: AttendanceEmployeeRef
    shift: AttendanceShiftRef | null
}

// Detail item — the single-record response additionally enriches created/updated users.
export interface AttendanceDetail extends Attendance {
    createdBy: AttendanceUser | null
    updatedBy: AttendanceUser | null
}

export interface EmployeeDropdownItem {
    id: string
    employeeCode: string
    user: { id: string; firstName: string; lastName: string } | null
}

export interface AttendanceFilters {
    search?: string
    employeeId?: string
    date?: string
    month?: number
    year?: number
    status?: AttendanceStatus
    page?: number
    limit?: number
    sortBy?: string
    sortOrder?: 'ASC' | 'DESC'
}

export interface AttendanceMeta {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
}

export interface AttendanceResponse {
    data: Attendance[]
    meta: AttendanceMeta | null
}

export interface CheckInPayload {
    employeeId: string
    date: string
    checkIn: string
    workMode?: WorkMode
    source?: AttendanceSource
    notes?: string | null
}

export interface UpdateAttendancePayload {
    checkIn?: string
    checkOut?: string
    workMode?: WorkMode
    source?: AttendanceSource
    notes?: string | null
}

// Builds a human label for an employee dropdown entry.
export function employeeLabel(employee: EmployeeDropdownItem): string {
    if (employee.user) {
        return `${employee.user.firstName} ${employee.user.lastName} (${employee.employeeCode})`
    }
    return employee.employeeCode
}

// Formats a stored "HH:MM" (24-hour) time as 12-hour with an AM/PM suffix,
// e.g. "10:17" → "10:17 AM", "00:00" → "12:00 AM", "13:05" → "1:05 PM" (#9, #17).
export function formatTime12h(time: string | null | undefined): string {
    if (!time) return '—'
    const [hourPart, minutePart] = time.split(':')
    const hour = Number(hourPart)
    const minute = Number(minutePart)
    if (Number.isNaN(hour) || Number.isNaN(minute)) return time
    const period = hour < 12 ? 'AM' : 'PM'
    const hour12 = hour % 12 === 0 ? 12 : hour % 12
    return `${hour12}:${String(minute).padStart(2, '0')} ${period}`
}

export function useAttendanceList(filters: AttendanceFilters = {}) {
    return useQuery({
        queryKey: ['attendance', filters],
        queryFn: async (): Promise<AttendanceResponse> => {
            const { data: response } = await apiClient.get('/hr/attendance', { params: filters })
            return {
                data: response?.data ?? (Array.isArray(response) ? response : []),
                meta: response?.meta ?? null,
            }
        },
        placeholderData: keepPreviousData,
        // Always refetch on mount so updated shift, employee name/code and metrics
        // show immediately when returning to the list — the global 60s staleTime
        // otherwise served a stale cache (#8, #11, #12, #25).
        staleTime: 0,
        refetchOnMount: 'always',
    })
}

export function useAttendanceRecord(id: string) {
    return useQuery({
        queryKey: ['attendance', id],
        queryFn: async () => {
            const { data: response } = await apiClient.get(`/hr/attendance/${id}`)
            return (response?.data || response) as AttendanceDetail
        },
        enabled: !!id,
        // Refetch on mount so the details/correct screens reflect an updated shift,
        // employee code, work mode and source without a manual refresh (#20, #22, #24, #25).
        staleTime: 0,
        refetchOnMount: 'always',
    })
}

// Local dropdown hook for ACTIVE employees — the shared useEmployees module is built
// separately; this keeps attendance/leave self-contained without editing another module.
export function useEmployeesDropdown() {
    return useQuery({
        queryKey: ['employees', 'dropdown'],
        queryFn: async () => {
            const { data: response } = await apiClient.get('/hr/employees/dropdown')
            const responseData = response?.data || response
            return (Array.isArray(responseData) ? responseData : []) as EmployeeDropdownItem[]
        },
        // Refetch on mount so a just-renamed / newly-created employee appears in the
        // dropdown without waiting out the global 60s staleTime (#3, #6, #12). The
        // backend dropdown already returns only ACTIVE + login-enabled employees (#7).
        staleTime: 0,
        refetchOnMount: 'always',
    })
}

export function useCheckIn() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (data: CheckInPayload) => {
            const { data: response } = await apiClient.post('/hr/attendance/check-in', data)
            return response?.data || response
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] })
            toast.success('Check-in recorded successfully')
        },
    })
}

export function useCheckOut() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, checkOut }: { id: string; checkOut: string }) => {
            const { data: response } = await apiClient.patch(`/hr/attendance/${id}/check-out`, { checkOut })
            return response?.data || response
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] })
            queryClient.invalidateQueries({ queryKey: ['attendance', variables.id] })
            queryClient.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'Attendance', variables.id] })
            toast.success('Check-out recorded successfully')
        },
    })
}

export function useUpdateAttendance() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: UpdateAttendancePayload }) => {
            const { data: response } = await apiClient.patch(`/hr/attendance/${id}`, data)
            return response?.data || response
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] })
            queryClient.invalidateQueries({ queryKey: ['attendance', variables.id] })
            queryClient.invalidateQueries({ queryKey: ['audit-logs', 'entity', 'Attendance', variables.id] })
            toast.success('Attendance updated successfully')
        },
    })
}

export function useDeleteAttendance() {
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            await apiClient.delete(`/hr/attendance/${id}`)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance'] })
            toast.success('Attendance record deleted successfully')
        },
        onError: (error: unknown) => {
            toast.error(getApiErrorMessage(error, 'Failed to delete attendance record'))
        },
    })
}
