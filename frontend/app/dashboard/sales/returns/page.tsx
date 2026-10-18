'use client'

import Link from 'next/link'
import { format } from 'date-fns'
import { RotateCcw, Eye, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { useSaleReturns, type SaleReturnRow } from '@/hooks/useSaleReturns'
import { formatCurrency } from '@/lib/currency'

const getRefundBadge = (status: string) => {
  switch (status) {
    case 'PROCESSED':
      return <Badge className="bg-green-100 text-green-700 border-green-200">Processed</Badge>
    case 'PENDING':
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pending</Badge>
    case 'FAILED':
      return <Badge className="bg-red-100 text-red-700 border-red-200">Failed</Badge>
    default:
      return <Badge className="bg-gray-100 text-gray-700 border-gray-200">{status}</Badge>
  }
}

const money = (v: unknown) => formatCurrency(Number(v ?? 0))

export default function SaleReturnsPage() {
  const controller = useDataTable({ initialSortBy: 'createdAt', initialSortOrder: 'DESC' })

  const { data, isLoading, isError } = useSaleReturns({ ...(controller.queryParams as any) })

  const returns = data?.data ?? []
  const meta = data?.meta

  const filters: DataTableFilter<SaleReturnRow>[] = [
    {
      key: 'status',
      label: 'Sale status',
      options: [
        { value: 'DRAFT', label: 'Draft' },
        { value: 'COMPLETED', label: 'Completed' },
        { value: 'CANCELLED', label: 'Cancelled' },
      ],
    },
    { type: 'daterange', label: 'Date', fromKey: 'startDate', toKey: 'endDate' },
  ]

  const columns: DataTableColumn<SaleReturnRow>[] = [
    {
      key: 'returnNumber',
      header: 'Return #',
      sortable: true,
      render: (r) => <span className="font-medium text-gray-900">{r.returnNumber}</span>,
    },
    {
      key: 'saleNumber',
      header: 'Sale #',
      sortable: true,
      render: (r) => r.sale?.saleNumber || '-',
    },
    {
      key: 'customer',
      header: 'Customer',
      sortable: true,
      render: (r) => r.sale?.customer?.name || 'Walk-in',
    },
    {
      key: 'returnDate',
      header: 'Return Date',
      sortable: true,
      render: (r) => (r.returnDate ? format(new Date(r.returnDate), 'MMM dd, yyyy') : '-'),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (r) => (
        <Badge className="bg-green-100 text-green-700 border-green-200">{r.status}</Badge>
      ),
    },
    {
      key: 'refundStatus',
      header: 'Refund',
      sortable: true,
      render: (r) => getRefundBadge(r.refundStatus),
    },
    {
      key: 'totalAmount',
      header: 'Total',
      align: 'right',
      sortable: true,
      render: (r) => <span className="font-medium text-gray-900">{money(r.totalAmount)}</span>,
    },
  ]

  return (
    <ProtectedRoute>
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <RotateCcw className="h-8 w-8 text-green-600" />
              Sale Returns
            </h1>
            <p className="text-gray-600 mt-1">Returns processed against completed sales</p>
          </div>
          <Link href="/dashboard/sales/returns/create">
            <Button className="bg-green-600 hover:bg-green-700 text-white shadow-sm">
              <Plus className="h-4 w-4 mr-2" />
              Create Return
            </Button>
          </Link>
        </div>

        {/* Table */}
        <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden">
          <CardContent className="p-4">
            <DataTable<SaleReturnRow>
              columns={columns}
              data={returns}
              meta={meta}
              controller={controller}
              rowKey={(r) => r.id}
              isLoading={isLoading}
              isError={isError}
              errorMessage="Error loading sale returns"
              searchable
              searchPlaceholder="Search return #, sale #, customer..."
              filters={filters}
              pageSizeOptions
              emptyMessage="No sale returns found."
              actions={(r) => (
                <Link href={`/dashboard/sales/returns/${r.id}?saleId=${r.originalSaleId}`}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-500 hover:text-green-600"
                    title="View return"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </Link>
              )}
            />
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
