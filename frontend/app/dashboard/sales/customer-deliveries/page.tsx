'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ModuleListShell } from '@/components/ui/module-list-shell'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { useUrlStatusTabs, useListQueryParams } from '@/hooks/useUrlStatusTabs'
import {
  useCustomerDeliveries,
  formatDeliverySalesPersonName,
  type CustomerDelivery,
  type CustomerDeliveryStatus,
} from '@/hooks/useCustomerDeliveries'
import { formatCurrency } from '@/lib/currency'

const BASE_PATH = '/dashboard/sales/customer-deliveries'

const STATUS_LABELS: Record<CustomerDeliveryStatus, string> = {
  PENDING: 'Pending',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

const STATUS_TABS = [
  { value: 'all', label: 'All Deliveries' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

function getStatusStyle(status: CustomerDeliveryStatus) {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'DELIVERED':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-700 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default function CustomerDeliveriesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const orderIdFilter = searchParams.get('orderId') ?? undefined

  const controller = useDataTable({
    initialSortBy: 'deliveryDate',
    initialSortOrder: 'DESC',
  })

  const statusTabs = useUrlStatusTabs({
    basePath: BASE_PATH,
    preserveParams: ['orderId'],
  })

  const queryParams = useListQueryParams(controller, statusTabs, { orderId: orderIdFilter })

  const { data, isLoading, isError } = useCustomerDeliveries(queryParams)

  const columns: DataTableColumn<CustomerDelivery>[] = [
    {
      key: 'deliveryNumber',
      header: 'Delivery #',
      sortable: true,
      render: (delivery) => (
        <span className="font-mono text-sm font-medium text-green-700">{delivery.deliveryNumber}</span>
      ),
    },
    {
      key: 'deliveryDate',
      header: 'Date',
      sortable: true,
      render: (delivery) => (
        <span className="text-gray-700">{format(new Date(delivery.deliveryDate), 'MMM d, yyyy')}</span>
      ),
    },
    {
      key: 'customer.shopName',
      header: 'Shop',
      render: (delivery) => (
        <div>
          <p className="font-medium text-gray-900">{delivery.customer?.shopName ?? '—'}</p>
          {delivery.customer?.code && <p className="text-xs text-gray-500">{delivery.customer.code}</p>}
        </div>
      ),
    },
    {
      key: 'salesPerson',
      header: 'Sales Person',
      render: (delivery) => (
        <span className="text-gray-700">{formatDeliverySalesPersonName(delivery.salesPerson)}</span>
      ),
    },
    {
      key: 'order.orderNumber',
      header: 'Shop Order',
      render: (delivery) =>
        delivery.order ? (
          <Link
            href={`/dashboard/sales/customer-orders/${delivery.order.id}`}
            className="font-mono text-sm text-green-700 hover:text-green-800 hover:underline"
            onClick={(event) => event.stopPropagation()}
          >
            {delivery.order.orderNumber}
          </Link>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (delivery) => (
        <Badge className={getStatusStyle(delivery.status)}>
          {STATUS_LABELS[delivery.status] ?? delivery.status}
        </Badge>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      render: (delivery) => (
        <span className="font-medium text-gray-900">{formatCurrency(Number(delivery.totalAmount))}</span>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      align: 'right',
      render: (delivery) => (
        <span className="tabular-nums text-gray-700">
          {delivery._count?.items ?? delivery.items?.length ?? 0}
        </span>
      ),
    },
  ]

  return (
    <ProtectedRoute requiredPermission="customer-delivery.view">
      <ModuleListShell
        title="Shop Deliveries"
        subtitle="Confirm deliveries to debit the shop ledger and update linked shop orders."
        headerExtra={
          orderIdFilter ? (
            <p className="text-sm text-amber-800">
              Filtered to one shop order.{' '}
              <Link href={BASE_PATH} className="underline font-medium">
                Clear filter
              </Link>
            </p>
          ) : undefined
        }
        statusTabs={{
          value: statusTabs.value,
          onChange: statusTabs.onChange,
          tabs: STATUS_TABS,
        }}
      >
        <DataTable<CustomerDelivery>
          columns={columns}
          data={data?.data}
          meta={data?.meta}
          controller={controller}
          rowKey={(delivery) => delivery.id}
          isLoading={isLoading}
          isError={isError}
          errorMessage="Failed to load shop deliveries."
          searchPlaceholder="Search deliveries…"
          pageSizeOptions
          emptyMessage={
            orderIdFilter
              ? 'No deliveries linked to this shop order.'
              : 'No shop deliveries found matching your criteria.'
          }
          onRowClick={(delivery) => router.push(`${BASE_PATH}/${delivery.id}`)}
          actions={(delivery) => (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.push(`${BASE_PATH}/${delivery.id}`)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        />
      </ModuleListShell>
    </ProtectedRoute>
  )
}
