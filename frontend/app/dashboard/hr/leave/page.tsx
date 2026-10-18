'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Plus, MoreVertical, Trash2, FileText } from 'lucide-react'
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
import { useEmployeesDropdown, employeeLabel } from '@/hooks/useEmployees'
import {
  useLeaveRequests,
  useDeleteLeaveRequest,
  LEAVE_STATUS_LABELS,
  LEAVE_DURATION_LABELS,
  type LeaveRequest,
  type LeaveRequestStatus,
} from '@/hooks/useLeaveRequests'

const STATUS_BADGE_VARIANT: Record<LeaveRequestStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  PENDING: 'secondary',
  APPROVED: 'default',
  REJECTED: 'destructive',
  CANCELLED: 'outline',
}

function employeeName(leaveRequest: LeaveRequest): string {
  if (leaveRequest.employee.user) {
    return `${leaveRequest.employee.user.firstName} ${leaveRequest.employee.user.lastName}`
  }
  return leaveRequest.employee.employeeCode
}

export default function LeaveRequestsPage() {
  const router = useRouter()
  const controller = useDataTable()
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const { data, isLoading, isError } = useLeaveRequests({ ...(controller.queryParams as any) })
  const { data: employees = [] } = useEmployeesDropdown()
  const deleteMutation = useDeleteLeaveRequest()

  const leaveRequests = data?.data ?? []
  const meta = data?.meta

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return
    try {
      await deleteMutation.mutateAsync(deleteTargetId)
    } finally {
      setDeleteTargetId(null)
    }
  }

  const columns: DataTableColumn<LeaveRequest>[] = [
    {
      key: 'employee',
      header: 'Employee',
      sortable: true,
      sortKey: 'employee.user.firstName',
      render: (lr) => (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900">{employeeName(lr)}</span>
          <span className="text-xs text-gray-400">{lr.employee.employeeCode}</span>
        </div>
      ),
    },
    {
      key: 'startDate',
      header: 'From',
      sortable: true,
      render: (lr) => <span className="text-gray-700">{format(new Date(lr.startDate), 'MMM d, yyyy')}</span>,
    },
    {
      key: 'endDate',
      header: 'To',
      sortable: true,
      render: (lr) => <span className="text-gray-700">{format(new Date(lr.endDate), 'MMM d, yyyy')}</span>,
    },
    {
      key: 'totalDays',
      header: 'Days',
      align: 'center',
      sortable: true,
      sortKey: 'totalDays',
      render: (lr) => <span className="text-gray-700">{lr.totalDays}</span>,
    },
    {
      key: 'durationType',
      header: 'Duration',
      sortable: true,
      sortKey: 'durationType',
      render: (lr) => <span className="text-gray-700">{LEAVE_DURATION_LABELS[lr.durationType]}</span>,
    },
    {
      key: 'isPaid',
      header: 'Paid',
      align: 'center',
      sortable: true,
      sortKey: 'isPaid',
      render: (lr) => (
        <Badge variant={lr.isPaid ? 'default' : 'outline'}>{lr.isPaid ? 'Paid' : 'Unpaid'}</Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortKey: 'status',
      render: (lr) => (
        <Badge variant={STATUS_BADGE_VARIANT[lr.status]}>{LEAVE_STATUS_LABELS[lr.status]}</Badge>
      ),
    },
  ]

  const filters: DataTableFilter<LeaveRequest>[] = [
    {
      key: 'status',
      label: 'Status',
      options: (Object.keys(LEAVE_STATUS_LABELS) as LeaveRequestStatus[]).map((status) => ({
        value: status,
        label: LEAVE_STATUS_LABELS[status],
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
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Leave Requests</h2>
          <p className="text-gray-500">Manage employee leave requests and approvals.</p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/hr/leave/create')}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" /> New Request
        </Button>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <DataTable<LeaveRequest>
            columns={columns}
            data={leaveRequests}
            meta={meta}
            controller={controller}
            rowKey={(lr) => lr.id}
            isLoading={isLoading}
            isError={isError}
            errorMessage="Failed to load leave requests."
            searchable={false}
            filters={filters}
            pageSizeOptions
            emptyMessage="No leave requests found."
            onRowClick={(lr) => router.push(`/dashboard/hr/leave/${lr.id}`)}
            actions={(lr) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-gray-200">
                  <DropdownMenuLabel className="text-gray-700">Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/hr/leave/${lr.id}`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <FileText className="mr-2 h-4 w-4" /> View Details
                  </DropdownMenuItem>
                  {lr.status === 'PENDING' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteTargetId(lr.id)}
                        className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTargetId}
        title="Delete Leave Request"
        description="Are you sure you want to delete this leave request? Only pending requests with no decisions can be deleted."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  )
}
