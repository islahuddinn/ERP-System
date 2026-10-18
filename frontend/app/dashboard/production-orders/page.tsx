'use client'

import { useRouter } from 'next/navigation'
import { Factory, Plus, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ModuleStatusTabs } from '@/components/ui/module-status-tabs'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { useUrlStatusTabs, useListQueryParams } from '@/hooks/useUrlStatusTabs'
import { normalizeProductionListStatus } from '@/lib/list-status-filters'
import { useProductionOrders, type ProductionOrder } from '@/hooks/useProductionOrders'
import { useProductsDropdown } from '@/hooks/useProducts'
import { useSitesDropdown } from '@/hooks/useSites'
import { formatCurrency } from '@/lib/currency'

const BASE_PATH = '/dashboard/production-orders'

const STATUS_TABS = [
  { value: 'all', label: 'All Orders' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
  IN_PROGRESS: 'bg-blue-100 text-blue-700 border-blue-200',
  COMPLETED: 'bg-green-100 text-green-700 border-green-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
}

const money = (v: unknown) => formatCurrency(Number(v ?? 0))

export default function ProductionOrdersPage() {
  const router = useRouter()
  const controller = useDataTable({ initialSortBy: 'createdAt', initialSortOrder: 'DESC' })

  const statusTabs = useUrlStatusTabs({
    basePath: BASE_PATH,
    normalizeValue: (raw) => normalizeProductionListStatus(raw) ?? raw,
  })

  const queryParams = useListQueryParams(controller, statusTabs)

  const { data: products = [] } = useProductsDropdown()
  const { data: sites = [] } = useSitesDropdown()

  const { data, isLoading, isError } = useProductionOrders(queryParams as Parameters<typeof useProductionOrders>[0])

  const orders = data?.data ?? []
  const meta = data?.meta

  const filters: DataTableFilter<ProductionOrder>[] = [
    {
      key: 'productId',
      label: 'Product',
      searchable: true,
      options: (products as any[]).map((p) => ({ value: p.id, label: `${p.name}${p.code ? ` (${p.code})` : ''}` })),
    },
    {
      key: 'siteId',
      label: 'Site',
      searchable: true,
      options: (sites as any[]).map((s) => ({ value: s.id, label: `${s.name}${s.code ? ` (${s.code})` : ''}` })),
    },
    { type: 'daterange', label: 'Date', fromKey: 'startDate', toKey: 'endDate' },
  ]

  const columns: DataTableColumn<ProductionOrder>[] = [
    {
      key: 'orderNumber',
      header: 'Order #',
      sortable: true,
      render: (o) => <span className="font-medium text-gray-900">{o.orderNumber}</span>,
    },
    {
      key: 'product',
      header: 'Product',
      render: (o) => (
        <div className="flex flex-col">
          <span>{o.product?.name ?? '—'}</span>
          {o.product?.code && <span className="text-xs text-gray-500 font-mono">{o.product.code}</span>}
        </div>
      ),
    },
    { key: 'plannedQuantity', header: 'Planned', align: 'right', sortable: true },
    { key: 'producedQuantity', header: 'Produced', align: 'right' },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (o) => (
        <Badge className={`font-medium ${STATUS_STYLES[o.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {o.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'totalCost',
      header: 'Total Cost',
      align: 'right',
      sortable: true,
      render: (o) => <span className="font-medium">{money(o.totalCost)}</span>,
    },
    {
      key: 'costPerUnit',
      header: 'Cost / Unit',
      align: 'right',
      render: (o) => (o.costPerUnit ? money(o.costPerUnit) : '—'),
    },
  ]

  return (
    <ProtectedRoute>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Factory className="h-8 w-8 text-green-600" />
              Production Orders
            </h1>
            <p className="text-gray-600 mt-1">Plan, run, and cost manufacturing orders</p>
          </div>
          <Button onClick={() => router.push('/dashboard/production-orders/create')} className="bg-green-600 hover:bg-green-700 text-white">
            <Plus className="h-4 w-4 mr-2" /> Create Production Order
          </Button>
        </div>

        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <ModuleStatusTabs
              value={statusTabs.value}
              onChange={statusTabs.onChange}
              tabs={STATUS_TABS}
            />
          </CardHeader>
          <CardContent className="pt-0 p-4">
            <DataTable<ProductionOrder>
              columns={columns}
              data={orders}
              meta={meta}
              controller={controller}
              rowKey={(o) => o.id}
              isLoading={isLoading}
              isError={isError}
              searchable
              searchPlaceholder="Search by order number…"
              filters={filters}
              pageSizeOptions
              emptyMessage="No production orders found"
              onRowClick={(o) => router.push(`/dashboard/production-orders/${o.id}`)}
              actions={(o) => (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/dashboard/production-orders/${o.id}`)}>
                  <Eye className="h-4 w-4" />
                </Button>
              )}
            />
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
