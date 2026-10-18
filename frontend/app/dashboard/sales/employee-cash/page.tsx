'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ArrowLeftRight, Wallet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ModuleListShell } from '@/components/ui/module-list-shell'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { usePermissionCheck } from '@/hooks/usePermissionCheck'
import { useCurrentUser } from '@/hooks/useUsers'
import { useEmployeesDropdown, employeeLabel } from '@/hooks/useEmployees'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  EMPLOYEE_CASH_LEDGER_ENTRY_LABELS,
  formatEmployeeCashPerson,
  useEmployeeCashLedger,
  type EmployeeCashLedgerEntry,
} from '@/hooks/useEmployeeCashLedger'
import { formatCurrency } from '@/lib/currency'

export default function EmployeeCashLedgerPage() {
  const { hasPermission } = usePermissionCheck()
  const { data: currentUser } = useCurrentUser()
  const { data: employees = [] } = useEmployeesDropdown()
  const canViewAll = hasPermission('employee-cash-ledger.view-all')

  const myEmployeeId = useMemo(
    () => employees.find((employee) => employee.user?.id === currentUser?.id)?.id,
    [employees, currentUser?.id],
  )

  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('')

  useEffect(() => {
    if (selectedEmployeeId) return
    if (myEmployeeId) setSelectedEmployeeId(myEmployeeId)
  }, [myEmployeeId, selectedEmployeeId])

  const controller = useDataTable({ initialLimit: 20 })

  const { data, isLoading, isError } = useEmployeeCashLedger(
    selectedEmployeeId || undefined,
    controller.queryParams as Record<string, string | number>,
  )

  const columns: DataTableColumn<EmployeeCashLedgerEntry>[] = [
    {
      key: 'date',
      header: 'Date',
      render: (entry) => (
        <span className="text-gray-700">{format(new Date(entry.date), 'MMM d, yyyy h:mm a')}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (entry) => (
        <Badge variant="outline" className="font-normal">
          {EMPLOYEE_CASH_LEDGER_ENTRY_LABELS[entry.type] ?? entry.type}
        </Badge>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (entry) => <span className="text-gray-800">{entry.description}</span>,
    },
    {
      key: 'debit',
      header: 'Debit',
      align: 'right',
      render: (entry) => (
        <span className="tabular-nums text-red-700">
          {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
        </span>
      ),
    },
    {
      key: 'credit',
      header: 'Credit',
      align: 'right',
      render: (entry) => (
        <span className="tabular-nums text-green-700">
          {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
        </span>
      ),
    },
    {
      key: 'balance',
      header: 'Balance',
      align: 'right',
      render: (entry) => (
        <span className="tabular-nums font-medium text-gray-900">
          {formatCurrency(entry.balance)}
        </span>
      ),
    },
  ]

  const summary = data?.summary

  return (
    <ProtectedRoute
      requiredPermissions={['employee-cash-ledger.view', 'employee-cash-ledger.view-all']}
      requireAll={false}
    >
      <ModuleListShell
        title="Employee Cash Ledger"
        subtitle="Cash-in-hand and stock-debt movements for field staff and branch distributors."
        action={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/sales/employee-cash/transfers">
                <ArrowLeftRight className="mr-2 h-4 w-4" />
                Transfers
              </Link>
            </Button>
            {hasPermission('employee-cash-transfer.create') && (
              <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
                <Link href="/dashboard/sales/employee-cash/transfers/create">
                  Record Transfer
                </Link>
              </Button>
            )}
          </div>
        }
      >
        {canViewAll && (
          <div className="mb-4 max-w-md">
            <label className="text-sm font-medium text-gray-700 block mb-1">Employee</label>
            <Select
              value={selectedEmployeeId || undefined}
              onValueChange={setSelectedEmployeeId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((employee) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employeeLabel(employee)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {!canViewAll && data?.employee && (
          <p className="mb-4 text-sm text-gray-600">
            Viewing ledger for {formatEmployeeCashPerson(data.employee)}
          </p>
        )}

        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                  <Wallet className="h-4 w-4" /> Cash in Hand
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(summary.currentCashInHand)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Collected (Recoveries)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(summary.totalCollected)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Net Stock Debt</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-amber-700">
                  {formatCurrency(summary.netStockDebt)}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        <DataTable<EmployeeCashLedgerEntry>
          columns={columns}
          data={data?.ledger.data}
          meta={data?.ledger.meta}
          controller={controller}
          rowKey={(entry) => entry.id}
          isLoading={isLoading || !selectedEmployeeId}
          isError={isError}
          errorMessage="Failed to load employee cash ledger."
          emptyMessage="No ledger entries yet."
          pageSizeOptions
        />
      </ModuleListShell>
    </ProtectedRoute>
  )
}
