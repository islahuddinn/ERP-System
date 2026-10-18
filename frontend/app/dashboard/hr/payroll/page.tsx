'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Plus, MoreVertical, Wallet, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { useMoney } from '@/contexts/currency-context'
import { PayrollStatusBadge } from '@/components/hr/payroll/PayrollStatusBadge'
import { usePayrolls, payrollEmployeeName, type Payroll } from '@/hooks/usePayroll'

export default function PayrollPage() {
  const router = useRouter()
  const controller = useDataTable()
  const money = useMoney()

  const { data, isLoading, isError } = usePayrolls({ ...(controller.queryParams as any) })

  const payrolls = data?.data ?? []
  const meta = data?.meta

  // Backend PayrollQueryDto supports ?status=DRAFT|APPROVED|PAID — static filter.
  const filters: DataTableFilter<Payroll>[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'DRAFT', label: 'Draft' },
        { value: 'APPROVED', label: 'Approved' },
        { value: 'PAID', label: 'Paid' },
      ],
    },
  ]

  const columns: DataTableColumn<Payroll>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (p) => (
        <span className="flex items-center gap-2 font-medium text-gray-900">
          <Wallet className="h-4 w-4 text-gray-400" />
          <span>
            {payrollEmployeeName(p.employee)}
            <span className="block text-xs text-gray-500">{p.employee.employeeCode}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'periodStart',
      header: 'Period',
      sortable: true,
      render: (p) => (
        <span className="text-gray-700 text-sm">
          {format(new Date(p.periodStart), 'MMM d, yyyy')} – {format(new Date(p.periodEnd), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      key: 'paidMonth',
      header: 'Paid Month',
      sortable: true,
      render: (p) => <span className="text-gray-700 font-mono text-sm">{p.paidMonth}</span>,
    },
    {
      key: 'grossSalary',
      header: 'Gross',
      align: 'right',
      sortable: true,
      render: (p) => <span className="text-gray-700">{money(Number(p.grossSalary))}</span>,
    },
    {
      key: 'totalDeductions',
      header: 'Deductions',
      align: 'right',
      render: (p) => <span className="text-red-600">{money(Number(p.totalDeductions))}</span>,
    },
    {
      key: 'netPay',
      header: 'Net Pay',
      align: 'right',
      sortable: true,
      render: (p) => <span className="font-semibold text-gray-900">{money(Number(p.netPay))}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      align: 'center',
      render: (p) => (
        <div className="flex justify-center">
          <PayrollStatusBadge status={p.status} />
        </div>
      ),
    },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Payroll</h2>
          <p className="text-gray-500">Run, approve, and pay employee payroll for each period.</p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/hr/payroll/create')}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" /> Run Payroll
        </Button>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <DataTable<Payroll>
            columns={columns}
            data={payrolls}
            meta={meta}
            controller={controller}
            rowKey={(p) => p.id}
            isLoading={isLoading}
            isError={isError}
            errorMessage="Failed to load payroll records."
            searchable
            searchPlaceholder="Search by employee code or name..."
            filters={filters}
            pageSizeOptions
            emptyMessage="No payroll records found."
            onRowClick={(p) => router.push(`/dashboard/hr/payroll/${p.id}`)}
            actions={(p) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-gray-200">
                  <DropdownMenuLabel className="text-gray-700">Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/hr/payroll/${p.id}`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <FileText className="mr-2 h-4 w-4" /> View Details
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
