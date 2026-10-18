'use client'

import { useState } from 'react'
import { Plus, MoreHorizontal, UserMinus, UserCheck, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useDataTable } from '@/hooks/useDataTable'
import { usePermissionCheck } from '@/hooks/usePermissionCheck'
import {
  useSalesPersonAssignments,
  useUnassignSalesPerson,
  formatSalesPersonName,
  type SalesPersonAssignment,
} from '@/hooks/useSalesPersonAssignments'
import { AssignSalesPersonDialog } from '@/components/sales/sales-person-assignments/assign-sales-person-dialog'

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function SalesPersonAssignmentsPage() {
  const controller = useDataTable({ initialSortBy: 'createdAt', initialSortOrder: 'DESC' })
  const { data, isLoading, isError } = useSalesPersonAssignments(
    controller.queryParams as Record<string, string | number>,
  )
  const unassignMutation = useUnassignSalesPerson()
  const { hasPermission } = usePermissionCheck()
  const canManage = hasPermission('sales-person-assignment.manage')

  const [assignOpen, setAssignOpen] = useState(false)
  const [unassignTarget, setUnassignTarget] = useState<SalesPersonAssignment | null>(null)

  const assignments = data?.data ?? []
  const assignedEmployeeIds = assignments.map((row) => row.employeeId)

  const columns: DataTableColumn<SalesPersonAssignment>[] = [
    {
      key: 'employee',
      header: 'Sales Person',
      render: (row) => (
        <span className="font-medium text-gray-900">{formatSalesPersonName(row)}</span>
      ),
    },
    {
      key: 'branch',
      header: 'Branch',
      render: (row) => (
        <span className="text-gray-700">
          {row.branch.name}
          <span className="text-gray-400 ml-1">({row.branch.code})</span>
        </span>
      ),
    },
    {
      key: 'phone',
      header: 'Phone',
      render: (row) => (
        <span className="text-gray-600">{row.employee.user?.phone ?? '—'}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Assigned',
      render: (row) => (
        <span className="text-gray-600 tabular-nums">{formatDate(row.createdAt)}</span>
      ),
    },
  ]

  return (
    <ProtectedRoute requiredPermission="sales-person-assignment.view">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <UserCheck className="h-8 w-8 text-green-600" />
              Sales Person Assignments
            </h1>
            <p className="text-gray-600 mt-1">
              Assign employees to your distributor branch so they can book shop orders and fulfill deliveries.
            </p>
          </div>
          {canManage && (
            <Button
              onClick={() => setAssignOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white shrink-0"
            >
              <Plus className="mr-2 h-4 w-4" />
              Assign Sales Person
            </Button>
          )}
        </div>

        <Alert className="border-blue-200 bg-blue-50">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            Assignments are scoped to your distributor branch. The logged-in user must be linked to an employee
            who is the branch distributor. Re-assigning an employee who is already on another branch moves them here.
          </AlertDescription>
        </Alert>

        <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
          <CardContent className="p-4">
            <DataTable<SalesPersonAssignment>
              columns={columns}
              data={assignments}
              meta={data?.meta}
              controller={controller}
              rowKey={(row) => row.id}
              isLoading={isLoading}
              isError={isError}
              errorMessage="Failed to load sales person assignments."
              pageSizeOptions
              emptyMessage="No sales people assigned yet. Assign an employee to enable shop order booking."
              actions={(row) =>
                canManage ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => setUnassignTarget(row)}
                      >
                        <UserMinus className="mr-2 h-4 w-4" />
                        Unassign
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : undefined
              }
            />
          </CardContent>
        </Card>

        <AssignSalesPersonDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          assignedEmployeeIds={assignedEmployeeIds}
        />

        <ConfirmDialog
          open={Boolean(unassignTarget)}
          title="Unassign sales person?"
          description={
            unassignTarget
              ? `Remove ${formatSalesPersonName(unassignTarget)} from branch ${unassignTarget.branch.name}? They will no longer be able to book shop orders until re-assigned.`
              : ''
          }
          confirmLabel="Unassign"
          onConfirm={async () => {
            if (!unassignTarget) return
            try {
              await unassignMutation.mutateAsync(unassignTarget.employeeId)
            } catch {
              /* toast handled in hook */
            }
            setUnassignTarget(null)
          }}
          onCancel={() => setUnassignTarget(null)}
        />
      </div>
    </ProtectedRoute>
  )
}
