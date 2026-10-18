'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import { Truck, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { useSaleDispatches, type SaleDispatchListItem } from '@/hooks/useSaleDispatches'

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-700 border-gray-200'
    case 'APPROVED':
      return 'bg-teal-100 text-teal-700 border-teal-200'
    case 'DELIVERED':
      return 'bg-green-100 text-green-700 border-green-200'
    default:
      return 'bg-gray-100 text-gray-700'
  }
}

export default function SaleDispatchesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const saleIdFilter = searchParams?.get('saleId') || undefined

  const controller = useDataTable({ initialSortBy: 'createdAt', initialSortOrder: 'DESC' })

  // saleId is driven by the URL (not the toolbar) — merge it into the server query.
  const { data, isLoading, isError } = useSaleDispatches({
    ...(controller.queryParams as any),
    saleId: saleIdFilter,
  })

  const dispatches = data?.data ?? []
  const meta = data?.meta

  const filters: DataTableFilter<SaleDispatchListItem>[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'DRAFT', label: 'Draft' },
        { value: 'APPROVED', label: 'Approved' },
        { value: 'DELIVERED', label: 'Delivered' },
      ],
    },
    { type: 'daterange', label: 'Date', fromKey: 'startDate', toKey: 'endDate' },
  ]

  const columns: DataTableColumn<SaleDispatchListItem>[] = [
    {
      key: 'dispatchNumber',
      header: 'Dispatch #',
      sortable: true,
      render: (d) => <span className="font-medium text-gray-900">{d.dispatchNumber}</span>,
    },
    {
      key: 'sale',
      header: 'Sale',
      sortable: true,
      render: (d) => d.sale?.saleNumber || '-',
    },
    {
      key: 'customer',
      header: 'Customer',
      sortable: true,
      render: (d) => d.sale?.customer?.name || 'Walk-in',
    },
    {
      key: 'site',
      header: 'Site',
      sortable: true,
      render: (d) => (
        <span>
          {d.site?.name || '-'}
          {d.site?.code ? <span className="text-gray-500"> ({d.site.code})</span> : null}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (d) => (
        <Badge className={`font-medium ${getStatusStyle(d.status)}`}>{d.status}</Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (d) => (d.createdAt ? format(new Date(d.createdAt), 'MMM dd, yyyy') : '-'),
    },
  ]

  return (
    <ProtectedRoute>
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Truck className="h-8 w-8 text-green-600" />
                  Sale Dispatches
                </h1>
                <p className="text-gray-600 mt-1">
                  {saleIdFilter
                    ? 'Dispatches generated for the selected sale'
                    : 'Track delivery of goods from sites to customers'}
                </p>
              </div>
            </div>

            {/* Table */}
            <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden rounded-lg">
              <CardContent className="p-4">
                <DataTable<SaleDispatchListItem>
                  columns={columns}
                  data={dispatches}
                  meta={meta}
                  controller={controller}
                  rowKey={(d) => d.id}
                  isLoading={isLoading}
                  isError={isError}
                  errorMessage="Error loading dispatches"
                  searchable
                  searchPlaceholder="Search by Dispatch #..."
                  filters={filters}
                  pageSizeOptions
                  emptyMessage="No dispatches found."
                  onRowClick={(d) => router.push(`/dashboard/sales/dispatches/${d.id}`)}
                  actions={(d) => (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 hover:text-green-600"
                      onClick={() => router.push(`/dashboard/sales/dispatches/${d.id}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
