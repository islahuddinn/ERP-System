'use client'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Eye, Plus, Loader2 } from 'lucide-react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ModuleStatusTabs } from '@/components/ui/module-status-tabs'
import Link from 'next/link'
import { usePurchases, usePurchaseSummary, PurchaseOrder } from '@/hooks/usePurchases'
import { useSuppliersDropdown } from '@/hooks/useSuppliers'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { useUrlStatusTabs, useListQueryParams } from '@/hooks/useUrlStatusTabs'
import { normalizePurchaseListStatus } from '@/lib/list-status-filters'
import { formatCurrency } from '@/lib/currency'

const BASE_PATH = '/dashboard/purchases'

const STATUS_TABS = [
  { value: 'all', label: 'All Orders' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'CONFIRMED', label: 'Sent' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'RECEIVED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

// Badge styles include an explicit hover:bg-* matching each base color so the
// text stays readable when the surrounding row is hovered (QA #38).
const getStatusStyle = (status: string) => {
  switch (status) {
    case 'DRAFT': return 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100'
    case 'CONFIRMED': return 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
    case 'PARTIAL': return 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100'
    case 'RECEIVED': return 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100'
    case 'CANCELLED': return 'bg-red-100 text-red-700 border-red-200 hover:bg-red-100'
    default: return 'bg-gray-100 text-gray-700 hover:bg-gray-100'
  }
}

const getPaymentStatusStyle = (status: string) => {
  switch (status) {
    case 'PENDING': return 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100'
    case 'PARTIAL': return 'bg-yellow-100 text-yellow-700 border-yellow-200 hover:bg-yellow-100'
    case 'PAID': return 'bg-green-100 text-green-700 border-green-200 hover:bg-green-100'
    default: return 'bg-gray-100 text-gray-700 hover:bg-gray-100'
  }
}

const money = (v: unknown) => formatCurrency(Number(v ?? 0))

export default function PurchasesPage() {
  const router = useRouter()

  // The DataTable controller owns page/limit/debounced-search/sort/filters and
  // exposes queryParams for the list hook. Filter/column keys map 1:1 to the
  // backend PurchaseQueryDto params (status, paymentStatus, supplierId, startDate, endDate).
  const controller = useDataTable()

  const statusTabs = useUrlStatusTabs({
    basePath: BASE_PATH,
    normalizeValue: (raw) => normalizePurchaseListStatus(raw) ?? raw,
  })

  const queryParams = useListQueryParams(controller, statusTabs)

  const { data: suppliers = [] } = useSuppliersDropdown()

  const { data, isLoading, isError } = usePurchases(queryParams as Parameters<typeof usePurchases>[0])

  // Server-wide stats (not limited to the current page) for the summary cards.
  const { data: summary, isLoading: summaryLoading } = usePurchaseSummary()

  const purchaseOrders: PurchaseOrder[] = data?.data ?? []
  const meta = data?.meta
  const total = Number(meta?.total ?? purchaseOrders.length) || 0

  // Summary cards:
  // - No filter active → use the server-wide summary endpoint (correct across all pages).
  // - Any filter active → reflect the filtered result set. "Total Orders" uses the
  //   filtered server total (meta.total); the status/value breakdowns are derived from
  //   the filtered rows so the cards update with the selected filter (QA #19).
  const isFiltered = controller.isFiltered || Boolean(statusTabs.filterValue)
  const PENDING_STATUSES = ['DRAFT', 'CONFIRMED']
  const filteredPending = purchaseOrders.filter((o) => PENDING_STATUSES.includes(o.status)).length
  const filteredCompleted = purchaseOrders.filter((o) => o.status === 'RECEIVED').length
  const filteredValue = purchaseOrders.reduce(
    (sum, o) => sum + (Number(o.totalAmount) || 0),
    0,
  )

  const pendingDelivery = isFiltered ? filteredPending : Number(summary?.pendingOrders ?? 0) || 0
  const completedOrders = isFiltered ? filteredCompleted : Number(summary?.completedOrders ?? 0) || 0
  const totalValue = isFiltered ? filteredValue : Number(summary?.totalValue ?? 0) || 0
  // Total Orders always reflects the live server total from the purchases query
  // (meta.total), which is invalidated/refetched on create & delete — so the card
  // updates immediately, unlike the cached summary endpoint (QA #49).
  const totalOrders = total
  const statsLoading = isFiltered ? isLoading : isLoading || summaryLoading

  const filters: DataTableFilter<PurchaseOrder>[] = [
    {
      key: 'paymentStatus',
      label: 'Payment',
      options: [
        { value: 'PENDING', label: 'Pending' },
        { value: 'PARTIAL', label: 'Partial' },
        { value: 'PAID', label: 'Paid' },
      ],
    },
    {
      key: 'supplierId',
      label: 'Supplier',
      searchable: true,
      options: (suppliers as any[]).map((s) => ({ value: s.id, label: s.name })),
    },
    { type: 'daterange', label: 'Order Date', fromKey: 'startDate', toKey: 'endDate' },
  ]

  const columns: DataTableColumn<PurchaseOrder>[] = [
    {
      key: 'orderNumber',
      header: 'Order #',
      sortable: true,
      render: (o) => <span className="font-medium text-gray-900">{o.orderNumber}</span>,
    },
    {
      key: 'orderDate',
      header: 'Date',
      sortable: true,
      render: (o) => (
        <span className="text-gray-600">{format(new Date(o.orderDate), 'MMM dd, yyyy')}</span>
      ),
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (o) => (
        <div className="flex flex-col">
          <span className="text-gray-900">{o.supplier?.name ?? o.supplierName ?? '—'}</span>
          {o.supplier?.contactPerson && (
            <span className="text-xs text-gray-500">{o.supplier.contactPerson}</span>
          )}
        </div>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      render: (o) => <span className="font-medium text-gray-900">{money(o.totalAmount)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (o) => (
        <Badge className={`font-medium ${getStatusStyle(o.status)}`}>{o.status}</Badge>
      ),
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
      render: (o) => (
        <Badge className={`font-medium ${getPaymentStatusStyle(o.paymentStatus)}`}>
          {o.paymentStatus}
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
                  <ShoppingCart className="h-8 w-8 text-green-600" />
                  Purchase Orders
                </h1>
                <p className="text-gray-600 mt-1">
                  Manage and track all purchase orders
                </p>
              </div>
              <Link href="/dashboard/purchases/create">
                <Button className="bg-green-600 hover:bg-green-700 text-white shadow-sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create PO
                </Button>
              </Link>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="bg-white border md:col-span-1 border-gray-200 shadow-sm">
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-gray-500">Total Orders</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-2">
                    {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : totalOrders}
                  </h3>
                </CardContent>
              </Card>
              <Card className="bg-white border md:col-span-1 border-gray-200 shadow-sm">
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-gray-500">Pending Delivery</p>
                  <h3 className="text-2xl font-bold text-blue-600 mt-2">
                    {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : pendingDelivery}
                  </h3>
                </CardContent>
              </Card>
              <Card className="bg-white border md:col-span-1 border-gray-200 shadow-sm">
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <h3 className="text-2xl font-bold text-green-600 mt-2">
                    {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : completedOrders}
                  </h3>
                </CardContent>
              </Card>
              <Card className="bg-white border md:col-span-1 border-gray-200 shadow-sm">
                <CardContent className="pt-6">
                  <p className="text-sm font-medium text-gray-500">Total Value</p>
                  <h3 className="text-2xl font-bold text-gray-900 mt-2">
                    {statsLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : money(totalValue)}
                  </h3>
                </CardContent>
              </Card>
            </div>

            {/* Table */}
            <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden rounded-lg">
              <CardHeader className="pb-3">
                <ModuleStatusTabs
                  value={statusTabs.value}
                  onChange={statusTabs.onChange}
                  tabs={STATUS_TABS}
                />
              </CardHeader>
              <CardContent className="pt-0 p-4">
                <DataTable<PurchaseOrder>
                  columns={columns}
                  data={purchaseOrders}
                  meta={meta}
                  controller={controller}
                  rowKey={(o) => o.id}
                  isLoading={isLoading}
                  isError={isError}
                  errorMessage="Error loading purchase orders"
                  searchable
                  searchPlaceholder="Search by Order # or Supplier..."
                  filters={filters}
                  pageSizeOptions
                  emptyMessage="No purchase orders found."
                  onRowClick={(o) => router.push(`/dashboard/purchases/${o.id}`)}
                  actions={(o) => (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-500 hover:text-green-600"
                      onClick={() => router.push(`/dashboard/purchases/${o.id}`)}
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
