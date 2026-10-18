'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { format } from 'date-fns'
import { ShoppingBag, Eye, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { useSales, type Sale } from '@/hooks/useSales'
import { formatCurrency } from '@/lib/currency'

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100'
    case 'COMPLETED':
      return 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100'
    case 'CANCELLED':
      return 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100'
    default:
      return 'bg-gray-100 text-gray-700 hover:bg-gray-100'
  }
}

const getPaymentStatusStyle = (status: string) => {
  switch (status) {
    case 'PENDING':
      return 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100'
    case 'PARTIAL':
      return 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
    case 'PAID':
      return 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100'
    default:
      return 'bg-gray-100 text-gray-700 hover:bg-gray-100'
  }
}

const money = (v: unknown) => formatCurrency(Number(v ?? 0))

export default function SalesPage() {
  const router = useRouter()
  const controller = useDataTable({ initialSortBy: 'createdAt', initialSortOrder: 'DESC' })

  const { data, isLoading, isError } = useSales({ ...(controller.queryParams as any) })

  const sales = data?.data ?? []
  const meta = data?.meta

  const filters: DataTableFilter<Sale>[] = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'DRAFT', label: 'Draft' },
        { value: 'COMPLETED', label: 'Completed' },
        { value: 'CANCELLED', label: 'Cancelled' },
      ],
    },
    {
      key: 'paymentStatus',
      label: 'Payment',
      options: [
        { value: 'PENDING', label: 'Pending' },
        { value: 'PARTIAL', label: 'Partial' },
        { value: 'PAID', label: 'Paid' },
      ],
    },
    { type: 'daterange', label: 'Sale date', fromKey: 'startDate', toKey: 'endDate' },
  ]

  const columns: DataTableColumn<Sale>[] = [
    {
      key: 'saleNumber',
      header: 'Sale #',
      sortable: true,
      render: (s) => <span className="font-medium text-gray-900">{s.saleNumber}</span>,
    },
    {
      key: 'saleDate',
      header: 'Date',
      sortable: true,
      render: (s) => (s.saleDate ? format(new Date(s.saleDate), 'MMM dd, yyyy') : '-'),
    },
    {
      key: 'customer',
      header: 'Customer',
      // Customer is a relation — backend maps this sortKey to `{ customer: { name } }`.
      sortable: true,
      sortKey: 'customerName',
      render: (s) => s.customer?.name || 'Walk-in',
    },
    {
      key: 'totalAmount',
      header: 'Total',
      sortable: true,
      render: (s) => <span className="font-medium text-gray-900">{money(s.totalAmount)}</span>,
    },
    {
      key: 'amountPaid',
      header: 'Paid',
      sortable: true,
      render: (s) => money(s.amountPaid),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (s) => (
        <Badge className={`font-medium ${getStatusStyle(s.status)}`}>{s.status}</Badge>
      ),
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      sortable: true,
      render: (s) => (
        <Badge className={`font-medium ${getPaymentStatusStyle(s.paymentStatus)}`}>
          {s.paymentStatus}
        </Badge>
      ),
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
                  <ShoppingBag className="h-8 w-8 text-green-600" />
                  Sales
                </h1>
                <p className="text-gray-600 mt-1">Manage customer sales and invoices</p>
              </div>
              <Link href="/dashboard/sales/create">
                <Button className="bg-green-600 hover:bg-green-700 text-white shadow-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Sale
                </Button>
              </Link>
            </div>

            {/* Table */}
            <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden rounded-lg">
              <CardContent className="p-4">
                <DataTable<Sale>
                  columns={columns}
                  data={sales}
                  meta={meta}
                  controller={controller}
                  rowKey={(s) => s.id}
                  isLoading={isLoading}
                  isError={isError}
                  errorMessage="Error loading sales"
                  searchable
                  searchPlaceholder="Search by Sale # or Customer..."
                  filters={filters}
                  pageSizeOptions
                  emptyMessage="No sales found."
                  onRowClick={(s) => router.push(`/dashboard/sales/${s.id}`)}
                  actions={(s) => (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 hover:text-green-600"
                      onClick={() => router.push(`/dashboard/sales/${s.id}`)}
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
