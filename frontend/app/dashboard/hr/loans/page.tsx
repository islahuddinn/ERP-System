'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MoreVertical, Banknote, Edit, Trash2, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { useMoney } from '@/contexts/currency-context'
import { LoanStatusBadge, LoanRepaymentBadge } from '@/components/hr/loans/LoanStatusBadge'
import {
  useLoanRequests,
  useDeleteLoanRequest,
  loanEmployeeName,
  type LoanRequest,
} from '@/hooks/useLoanRequests'

export default function LoanRequestsPage() {
  const router = useRouter()
  const controller = useDataTable()
  const money = useMoney()
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)

  const { data, isLoading, isError } = useLoanRequests({ ...(controller.queryParams as any) })
  const deleteMutation = useDeleteLoanRequest()

  const loans = data?.data ?? []
  const meta = data?.meta

  const handleDeleteConfirmed = async () => {
    if (!deleteTargetId) return
    try {
      await deleteMutation.mutateAsync(deleteTargetId)
    } finally {
      setDeleteTargetId(null)
    }
  }

  // Backend LoanRequestFiltersDto supports ?status — static filter.
  const filters: DataTableFilter<LoanRequest>[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'PENDING', label: 'Pending' },
        { value: 'APPROVED', label: 'Approved' },
        { value: 'REJECTED', label: 'Rejected' },
        { value: 'CANCELLED', label: 'Cancelled' },
        { value: 'COMPLETED', label: 'Completed' },
      ],
    },
  ]

  const columns: DataTableColumn<LoanRequest>[] = [
    {
      key: 'employee',
      header: 'Employee',
      render: (l) => (
        <span className="flex items-center gap-2 font-medium text-gray-900">
          <Banknote className="h-4 w-4 text-gray-400" />
          <span>
            {loanEmployeeName(l.employee)}
            <span className="block text-xs text-gray-500">{l.employee.employeeCode}</span>
          </span>
        </span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      align: 'right',
      render: (l) => <span className="text-gray-900 font-medium">{money(l.totalAmount)}</span>,
    },
    {
      key: 'totalInstallments',
      header: 'Installments',
      align: 'center',
      render: (l) => <span className="text-gray-700">{l.totalInstallments}</span>,
    },
    {
      key: 'paidAmount',
      header: 'Paid / Remaining',
      align: 'right',
      render: (l) => (
        <span className="text-sm">
          <span className="text-green-700">{money(l.paidAmount)}</span>
          <span className="text-gray-400"> / </span>
          <span className="text-gray-700">{money(l.remainingAmount)}</span>
        </span>
      ),
    },
    {
      key: 'repaymentStatus',
      header: 'Repayment',
      align: 'center',
      render: (l) => (
        <div className="flex justify-center">
          <LoanRepaymentBadge status={l.repaymentStatus} />
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (l) => (
        <div className="flex justify-center">
          <LoanStatusBadge status={l.status} />
        </div>
      ),
    },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Loan Requests</h2>
          <p className="text-gray-500">Manage employee loan requests, approvals, and repayments.</p>
        </div>
        <Button
          onClick={() => router.push('/dashboard/hr/loans/create')}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" /> New Loan Request
        </Button>
      </div>

      <Card className="bg-white border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-4">
          <DataTable<LoanRequest>
            columns={columns}
            data={loans}
            meta={meta}
            controller={controller}
            rowKey={(l) => l.id}
            isLoading={isLoading}
            isError={isError}
            errorMessage="Failed to load loan requests."
            filters={filters}
            pageSizeOptions
            emptyMessage="No loan requests found."
            onRowClick={(l) => router.push(`/dashboard/hr/loans/${l.id}`)}
            actions={(l) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 p-0">
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border-gray-200">
                  <DropdownMenuLabel className="text-gray-700">Actions</DropdownMenuLabel>
                  <DropdownMenuItem
                    onClick={() => router.push(`/dashboard/hr/loans/${l.id}`)}
                    className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                  >
                    <FileText className="mr-2 h-4 w-4" /> View Details
                  </DropdownMenuItem>
                  {/* Update/delete are only allowed while PENDING and no approver has decided (backend guard). */}
                  {l.status === 'PENDING' && (
                    <>
                      <DropdownMenuItem
                        onClick={() => router.push(`/dashboard/hr/loans/${l.id}/edit`)}
                        className="cursor-pointer text-gray-700 focus:text-gray-900 focus:bg-gray-50"
                      >
                        <Edit className="mr-2 h-4 w-4" /> Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setDeleteTargetId(l.id)}
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
        title="Delete Loan Request"
        description="Are you sure you want to delete this loan request? Only pending requests with no approval decisions can be deleted."
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTargetId(null)}
      />
    </div>
  )
}
