'use client'

import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import Link from 'next/link'
import { Eye, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ModuleListShell } from '@/components/ui/module-list-shell'
import { DataTable, type DataTableColumn } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { useUrlStatusTabs, useListQueryParams } from '@/hooks/useUrlStatusTabs'
import { usePermissionCheck } from '@/hooks/usePermissionCheck'
import {
  useCustomerOrders,
  formatSalesPersonName,
  type CustomerOrder,
  type CustomerOrderStatus,
} from '@/hooks/useCustomerOrders'
import { formatCurrency } from '@/lib/currency'

const BASE_PATH = '/dashboard/sales/customer-orders'

const STATUS_LABELS: Record<CustomerOrderStatus, string> = {
  PENDING: 'Pending',
  PARTIALLY_DELIVERED: 'Partially Delivered',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
}

const STATUS_TABS = [
  { value: 'all', label: 'All Orders' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PARTIALLY_DELIVERED', label: 'Partial' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

function getStatusStyle(status: CustomerOrderStatus) {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'PARTIALLY_DELIVERED':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'DELIVERED':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'CANCELLED':
      return 'bg-gray-100 text-gray-700 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default function CustomerOrdersPage() {
  const router = useRouter()
  const { hasPermission } = usePermissionCheck()
  const canCreate = hasPermission('customer-order.create')

  const controller = useDataTable({
    initialSortBy: 'orderDate',
    initialSortOrder: 'DESC',
  })

  const statusTabs = useUrlStatusTabs({ basePath: BASE_PATH })

  const queryParams = useListQueryParams(controller, statusTabs)

  const { data, isLoading, isError } = useCustomerOrders(
    queryParams,
  )

  const columns: DataTableColumn<CustomerOrder>[] = [
    {
      key: 'orderNumber',
      header: 'Order #',
      sortable: true,
      render: (order) => (
        <span className="font-mono text-sm font-medium text-green-700">{order.orderNumber}</span>
      ),
    },
    {
      key: 'orderDate',
      header: 'Date',
      sortable: true,
      render: (order) => (
        <span className="text-gray-700">{format(new Date(order.orderDate), 'MMM d, yyyy')}</span>
      ),
    },
    {
      key: 'customer.shopName',
      header: 'Shop',
      sortable: true,
      sortKey: 'customer.shopName',
      render: (order) => (
        <div>
          <p className="font-medium text-gray-900">{order.customer?.shopName ?? '—'}</p>
          {order.customer?.code && <p className="text-xs text-gray-500">{order.customer.code}</p>}
        </div>
      ),
    },
    {
      key: 'salesPerson',
      header: 'Sales Person',
      render: (order) => (
        <span className="text-gray-700">{formatSalesPersonName(order.salesPerson)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (order) => (
        <Badge className={getStatusStyle(order.status)}>
          {STATUS_LABELS[order.status] ?? order.status}
        </Badge>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      render: (order) => (
        <span className="font-medium text-gray-900">{formatCurrency(Number(order.totalAmount))}</span>
      ),
    },
    {
      key: 'items',
      header: 'Items',
      align: 'right',
      render: (order) => (
        <span className="tabular-nums text-gray-700">
          {order._count?.items ?? order.items?.length ?? 0}
        </span>
      ),
    },
  ]

  return (
    <ProtectedRoute requiredPermission="customer-order.view">
      <ModuleListShell
        title="Shop Orders"
        subtitle="Sales orders booked by sales persons at shop visits."
        action={
          canCreate ? (
            <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
              <Link href={`${BASE_PATH}/create`}>
                <Plus className="mr-2 h-4 w-4" /> Book Order
              </Link>
            </Button>
          ) : undefined
        }
        statusTabs={{
          value: statusTabs.value,
          onChange: statusTabs.onChange,
          tabs: STATUS_TABS,
        }}
      >
        <DataTable<CustomerOrder>
          columns={columns}
          data={data?.data}
          meta={data?.meta}
          controller={controller}
          rowKey={(order) => order.id}
          isLoading={isLoading}
          isError={isError}
          errorMessage="Failed to load shop orders."
          searchPlaceholder="Search shop orders…"
          pageSizeOptions
          emptyMessage="No shop orders found matching your criteria."
          onRowClick={(order) => router.push(`${BASE_PATH}/${order.id}`)}
          actions={(order) => (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.push(`${BASE_PATH}/${order.id}`)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        />
      </ModuleListShell>
    </ProtectedRoute>
  )
}
