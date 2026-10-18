'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Plus, MoreVertical, User, Edit, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { useEmployees, type Employee, type EmployeeStatus } from '@/hooks/useEmployees'

const STATUS_VARIANT: Record<EmployeeStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  ACTIVE: 'default',
  ONBOARDING: 'secondary',
  INACTIVE: 'outline',
  TERMINATED: 'destructive',
}

// Every employee now has a linked User (even laborers, with loginAccess=DISABLED),
// so the name comes straight from user. Only genuinely legacy records lack a user —
// those fall back to the employee code, never a "no login" placeholder.
function fullName(employee: Employee): string {
  if (employee.user) {
    return `${employee.user.firstName} ${employee.user.lastName}`.trim()
  }
  return employee.employeeCode
}

export default function EmployeesPage() {
  const router = useRouter()
  const controller = useDataTable()

  const { data, isLoading, isError } = useEmployees({ ...(controller.queryParams as any) })

  const employees = data?.data ?? []
  const meta = data?.meta

  // Backend EmployeeFiltersDto supports ?status — static options (server-paginated).
  const filters: DataTableFilter<Employee>[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'ACTIVE', label: 'Active' },
        { value: 'ONBOARDING', label: 'Onboarding' },
        { value: 'INACTIVE', label: 'Inactive' },
        { value: 'TERMINATED', label: 'Terminated' },
      ],
    },
  ]

  const columns: DataTableColumn<Employee>[] = [
    {
      key: 'name',
      header: 'Name',
      // Sorts by the linked user's first name (backend whitelists "user.firstName").
      sortable: true,
      sortKey: 'user.firstName',
      render: (e) => (
        <span className="flex items-center gap-2 font-medium text-gray-900">
          <User className="h-4 w-4 text-gray-400" />
          {fullName(e)}
        </span>
      ),
    },
    {
      key: 'employeeCode',
      header: 'Employee Code',
      sortable: true,
      render: (e) => <span className="text-gray-700 font-mono text-sm">{e.employeeCode}</span>,
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      sortKey: 'user.email',
      render: (e) =>
        e.user?.email ? (
          <span className="text-gray-700">{e.user.email}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (e) => (
        <div className="flex justify-center">
          <Badge variant={STATUS_VARIANT[e.status]}>{e.status}</Badge>
        </div>
      ),
    },
    {
      key: 'dateOfJoining',
      header: 'Joined',
      sortable: true,
      render: (e) => (
        <span className="text-gray-700">{format(new Date(e.dateOfJoining), 'MMM d, yyyy')}</span>
      ),
    },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Employees</h2>
          <p className="text-gray-500">Manage your workforce — staff accounts and laborers.</p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/hr/employees/create')}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Employee
        </Button>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <DataTable<Employee>
            columns={columns}
            data={employees}
            meta={meta}
            controller={controller}
            rowKey={(e) => e.id}
            isLoading={isLoading}
            isError={isError}
            errorMessage="Failed to load employees."
            searchable
            searchPlaceholder="Search by name, code or email..."
            filters={filters}
            pageSizeOptions
            emptyMessage="No employees found."
            onRowClick={(e) => router.push(`/dashboard/hr/employees/${e.id}`)}
            actions={(e) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-gray-200">
                  <DropdownMenuLabel className="text-gray-700">Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/hr/employees/${e.id}`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <FileText className="mr-2 h-4 w-4" /> View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/hr/employees/${e.id}/edit`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <Edit className="mr-2 h-4 w-4" /> Edit Details
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}
