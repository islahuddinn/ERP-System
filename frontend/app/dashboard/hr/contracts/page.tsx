'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Plus, MoreVertical, FileSignature, Edit, FileText } from 'lucide-react'
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
import { useMoney } from '@/contexts/currency-context'
import { useContracts, type Contract } from '@/hooks/useContracts'
import { useEmployeesDropdown, employeeLabel } from '@/hooks/useEmployees'
import { useDepartmentsDropdown } from '@/hooks/useDepartments'
import {
  CONTRACT_STATUS_VARIANT,
  CONTRACT_TYPE_LABEL,
  CONTRACT_TYPE_OPTIONS,
  contractEmployeeName,
  currentSalary,
} from '@/components/hr/contracts/constants'

export default function ContractsPage() {
  const router = useRouter()
  const controller = useDataTable()
  const money = useMoney()

  const { data, isLoading, isError } = useContracts({ ...(controller.queryParams as any) })

  const contracts = data?.data ?? []
  const meta = data?.meta

  // Employee + Department dropdowns drive the list filters (backend supports
  // ?employeeId and ?departmentId). Both queries are fresh (staleTime:0) so newly
  // added / renamed / deleted records appear without a manual refresh.
  const { data: employees = [] } = useEmployeesDropdown()
  const { data: departments = [] } = useDepartmentsDropdown()

  const employeeOptions = useMemo(
    () => employees.map((employee) => ({ value: employee.id, label: employeeLabel(employee) })),
    [employees],
  )
  const departmentOptions = useMemo(
    () => departments.map((department) => ({ value: department.id, label: department.name })),
    [departments],
  )

  // Backend ContractFiltersDto supports ?employeeId, ?departmentId, ?status and ?contractType.
  const filters: DataTableFilter<Contract>[] = [
    {
      key: 'employeeId',
      label: 'Employee',
      searchable: true,
      options: employeeOptions,
    },
    {
      key: 'departmentId',
      label: 'Department',
      searchable: true,
      options: departmentOptions,
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'DRAFT', label: 'Draft' },
        { value: 'ACTIVE', label: 'Active' },
        { value: 'EXPIRED', label: 'Expired' },
        { value: 'TERMINATED', label: 'Terminated' },
        { value: 'SUPERSEDED', label: 'Superseded' },
      ],
    },
    {
      key: 'contractType',
      label: 'Type',
      options: CONTRACT_TYPE_OPTIONS,
    },
  ]

  const columns: DataTableColumn<Contract>[] = [
    {
      key: 'employee',
      header: 'Employee',
      sortable: true,
      // Relation dot-notation — backend sorts on the linked user's first name.
      sortKey: 'employee.user.firstName',
      render: (c) => (
        <span className="flex items-center gap-2 font-medium text-gray-900">
          <FileSignature className="h-4 w-4 text-gray-400" />
          {contractEmployeeName(c)}
        </span>
      ),
    },
    {
      key: 'contractType',
      header: 'Type',
      sortable: true,
      // Backend whitelist sorts on the `contractType` column (#14).
      sortKey: 'contractType',
      render: (c) => <span className="text-gray-700">{CONTRACT_TYPE_LABEL[c.contractType]}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (c) => (
        <div className="flex justify-center">
          <Badge variant={CONTRACT_STATUS_VARIANT[c.status]}>{c.status}</Badge>
        </div>
      ),
    },
    {
      key: 'department',
      header: 'Department',
      sortable: true,
      sortKey: 'department.name',
      render: (c) =>
        c.department ? (
          <span className="text-gray-700">{c.department.name}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'salary',
      header: 'Current Salary',
      align: 'right',
      sortable: true,
      sortKey: 'currentSalary',
      render: (c) => {
        // Prefer the CURRENT salary revision; fall back to the denormalized
        // `currentSalary` scalar so a freshly-created DRAFT contract (which has no
        // CURRENT revision yet, only a DRAFT one) still shows its salary (#5).
        const revision = currentSalary(c)
        const amount = revision?.baseSalary ?? c.currentSalary
        return amount != null ? (
          <span className="text-gray-800 font-medium">{money(Number(amount))}</span>
        ) : (
          <span className="text-gray-400">—</span>
        )
      },
    },
    {
      key: 'startDate',
      header: 'Duration',
      sortable: true,
      // Duration spans startDate→endDate and can't be sorted as one DB column, so
      // we sort by startDate as a proxy (contracts order chronologically) (#16).
      sortKey: 'startDate',
      render: (c) => (
        <span className="text-gray-700 text-sm">
          {format(new Date(c.startDate), 'MMM d, yyyy')} – {format(new Date(c.endDate), 'MMM d, yyyy')}
        </span>
      ),
    },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Contracts</h2>
          <p className="text-gray-500">Employment contracts, salaries and allowances.</p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/hr/contracts/create')}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" /> Add Contract
        </Button>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <DataTable<Contract>
            columns={columns}
            data={contracts}
            meta={meta}
            controller={controller}
            rowKey={(c) => c.id}
            isLoading={isLoading}
            isError={isError}
            errorMessage="Failed to load contracts."
            searchPlaceholder="Search by employee name…"
            filters={filters}
            pageSizeOptions
            emptyMessage="No contracts found."
            onRowClick={(c) => router.push(`/dashboard/hr/contracts/${c.id}`)}
            actions={(c) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-gray-200">
                  <DropdownMenuLabel className="text-gray-700">Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/hr/contracts/${c.id}`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <FileText className="mr-2 h-4 w-4" /> View Details
                  </DropdownMenuItem>
                  {/* A terminated contract is read-only — hide Edit (#32). */}
                  {c.status !== 'TERMINATED' && (
                    <DropdownMenuItem
                      onClick={() => router.push(`/dashboard/hr/contracts/${c.id}/edit`)}
                      className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                    >
                      <Edit className="mr-2 h-4 w-4" /> Edit Details
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}
