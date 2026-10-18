'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { LogIn, LogOut, MoreVertical, Edit, Trash2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  useAttendanceList,
  useDeleteAttendance,
  useEmployeesDropdown,
  employeeLabel,
  formatTime12h,
  ATTENDANCE_STATUS_LABELS,
  type Attendance,
  type AttendanceStatus,
} from '@/hooks/useAttendance'
import { CheckInDialog } from '@/components/hr/attendance/check-in-dialog'
import { CheckOutDialog } from '@/components/hr/attendance/check-out-dialog'

const STATUS_BADGE_VARIANT: Record<AttendanceStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PRESENT: 'default',
  LATE: 'secondary',
  HALF_DAY: 'secondary',
  ABSENT: 'destructive',
  LEAVE: 'outline',
}

function employeeName(attendance: Attendance): string {
  if (attendance.employee.user) {
    return `${attendance.employee.user.firstName} ${attendance.employee.user.lastName}`
  }
  return attendance.employee.employeeCode
}

export default function AttendancePage() {
  const router = useRouter()
  const controller = useDataTable()
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [checkInOpen, setCheckInOpen] = useState(false)
  const [checkOutTargetId, setCheckOutTargetId] = useState<string | null>(null)

  const { data, isLoading, isError } = useAttendanceList({ ...(controller.queryParams as any) })
  const { data: employees = [] } = useEmployeesDropdown()
  const deleteMutation = useDeleteAttendance()

  const records = data?.data ?? []
  const meta = data?.meta

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return
    try {
      await deleteMutation.mutateAsync(deleteTargetId)
    } finally {
      setDeleteTargetId(null)
    }
  }

  const columns: DataTableColumn<Attendance>[] = [
    {
      key: 'employee',
      header: 'Employee',
      sortable: true,
      sortKey: 'employee.user.firstName',
      render: (a) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{employeeName(a)}</span>
          <span className="text-xs text-gray-400">{a.employee.employeeCode}</span>
        </div>
      ),
    },
    {
      key: 'date',
      header: 'Date',
      sortable: true,
      render: (a) => <span className="text-gray-700">{format(new Date(a.date), 'MMM d, yyyy')}</span>,
    },
    {
      key: 'checkIn',
      header: 'Check-in',
      sortable: true,
      render: (a) => <span className="font-mono text-gray-700">{formatTime12h(a.checkIn)}</span>,
    },
    {
      key: 'checkOut',
      header: 'Check-out',
      sortable: true,
      render: (a) =>
        a.checkOut ? (
          <span className="font-mono text-gray-700">{formatTime12h(a.checkOut)}</span>
        ) : (
          <span className="text-amber-600 text-xs">Not checked out</span>
        ),
    },
    {
      key: 'shift',
      header: 'Shift',
      sortable: true,
      sortKey: 'shift.name',
      render: (a) =>
        a.shift ? (
          <span className="text-gray-700">{a.shift.name}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (a) => (
        <Badge variant={STATUS_BADGE_VARIANT[a.status]}>{ATTENDANCE_STATUS_LABELS[a.status]}</Badge>
      ),
    },
    {
      key: 'lateMinutes',
      header: 'Late (min)',
      align: 'center',
      sortable: true,
      sortKey: 'lateMinutes',
      render: (a) => <span className="text-gray-700">{a.lateMinutes}</span>,
    },
  ]

  const filters: DataTableFilter<Attendance>[] = [
    {
      key: 'status',
      label: 'Status',
      options: (Object.keys(ATTENDANCE_STATUS_LABELS) as AttendanceStatus[]).map((status) => ({
        value: status,
        label: ATTENDANCE_STATUS_LABELS[status],
      })),
    },
    {
      key: 'employeeId',
      label: 'Employee',
      searchable: true,
      options: employees.map((employee) => ({ value: employee.id, label: employeeLabel(employee) })),
    },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Attendance</h2>
          <p className="text-gray-500">Track daily check-ins, check-outs and attendance metrics.</p>
        </div>
        <Button
          onClick={() => setCheckInOpen(true)}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <LogIn className="mr-2 h-4 w-4" /> Check-in
        </Button>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-4">
          {/* Date / Month filters — wired to the backend `date` (exact day) and
              `yearMonth` (YYYY-MM) query params the list endpoint already supports (#2). */}
          <div className="mb-4 flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-date" className="text-xs font-medium text-gray-700">
                Date
              </Label>
              <Input
                id="filter-date"
                type="date"
                value={controller.filters['date'] ?? ''}
                onChange={(e) => controller.setFilter('date', e.target.value || undefined)}
                className="h-10 w-[180px] border-gray-300"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="filter-month" className="text-xs font-medium text-gray-700">
                Month &amp; Year
              </Label>
              <Input
                id="filter-month"
                type="month"
                value={controller.filters['yearMonth'] ?? ''}
                onChange={(e) => controller.setFilter('yearMonth', e.target.value || undefined)}
                className="h-10 w-[180px] border-gray-300"
              />
            </div>
            {(controller.filters['date'] || controller.filters['yearMonth']) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-10 text-gray-600"
                onClick={() => {
                  controller.setFilter('date', undefined)
                  controller.setFilter('yearMonth', undefined)
                }}
              >
                Clear dates
              </Button>
            )}
          </div>
          <DataTable<Attendance>
            columns={columns}
            data={records}
            meta={meta}
            controller={controller}
            rowKey={(a) => a.id}
            isLoading={isLoading}
            isError={isError}
            errorMessage="Failed to load attendance records."
            searchable
            searchPlaceholder="Search by employee or shift..."
            filters={filters}
            pageSizeOptions
            emptyMessage="No attendance records found."
            onRowClick={(a) => router.push(`/dashboard/hr/attendance/${a.id}`)}
            actions={(a) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-gray-200">
                  <DropdownMenuLabel className="text-gray-700">Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/hr/attendance/${a.id}`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <FileText className="mr-2 h-4 w-4" /> View Details
                  </DropdownMenuItem>
                  {!a.checkOut && (
                    <DropdownMenuItem
                      onClick={() => setCheckOutTargetId(a.id)}
                      className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                    >
                      <LogOut className="mr-2 h-4 w-4" /> Check out
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/hr/attendance/${a.id}/edit`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <Edit className="mr-2 h-4 w-4" /> Correct Record
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteTargetId(a.id)}
                    className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </CardContent>
      </Card>

      <CheckInDialog open={checkInOpen} onOpenChange={setCheckInOpen} />
      <CheckOutDialog
        attendanceId={checkOutTargetId}
        onOpenChange={(open) => !open && setCheckOutTargetId(null)}
        onDone={() => setCheckOutTargetId(null)}
      />

      <ConfirmDialog
        open={!!deleteTargetId}
        title="Delete Attendance Record"
        description="Are you sure you want to delete this attendance record? This action cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  )
}
