'use client'

import { useRouter, useSearchParams } from 'next/navigation'
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
  useCustomerReturns,
  formatReturnSalesPersonName,
  CUSTOMER_RETURN_REASON_LABELS,
  CUSTOMER_RETURN_STATUS_LABELS,
  type CustomerReturn,
  type CustomerReturnStatus,
} from '@/hooks/useCustomerReturns'
import { formatCurrency } from '@/lib/currency'

const BASE_PATH = '/dashboard/sales/customer-returns'

const STATUS_TABS = [
  { value: 'all', label: 'All Returns' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
]

function getStatusStyle(status: CustomerReturnStatus) {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    case 'APPROVED':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'REJECTED':
      return 'bg-gray-100 text-gray-700 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default function CustomerReturnsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const deliveryItemIdFilter = searchParams.get('deliveryItemId') ?? undefined
  const { hasPermission } = usePermissionCheck()
  const canCreate = hasPermission('customer-return.create')

  const controller = useDataTable({
    initialSortBy: 'returnDate',
    initialSortOrder: 'DESC',
  })

  const statusTabs = useUrlStatusTabs({
    basePath: BASE_PATH,
    preserveParams: ['deliveryItemId'],
  })

  const queryParams = useListQueryParams(controller, statusTabs, {
    deliveryItemId: deliveryItemIdFilter,
  })

  const { data, isLoading, isError } = useCustomerReturns(queryParams)

  const columns: DataTableColumn<CustomerReturn>[] = [
    {
      key: 'returnNumber',
      header: 'Return #',
      sortable: true,
      render: (customerReturn) => (
        <span className="font-mono text-sm font-medium text-green-700">
          {customerReturn.returnNumber}
        </span>
      ),
    },
    {
      key: 'returnDate',
      header: 'Date',
      sortable: true,
      render: (customerReturn) => (
        <span className="text-gray-700">
          {format(new Date(customerReturn.returnDate), 'MMM d, yyyy')}
        </span>
      ),
    },
    {
      key: 'customer.shopName',
      header: 'Shop',
      render: (customerReturn) => (
        <div>
          <p className="font-medium text-gray-900">{customerReturn.customer?.shopName ?? '—'}</p>
          {customerReturn.customer?.code && (
            <p className="text-xs text-gray-500">{customerReturn.customer.code}</p>
          )}
        </div>
      ),
    },
    {
      key: 'product.name',
      header: 'Product',
      render: (customerReturn) => (
        <div>
          <p className="font-medium text-gray-900">
            {customerReturn.product?.name ?? customerReturn.productId}
          </p>
          {customerReturn.product?.code && (
            <p className="text-xs text-gray-500">{customerReturn.product.code}</p>
          )}
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Qty',
      align: 'right',
      render: (customerReturn) => (
        <span className="tabular-nums text-gray-700">{customerReturn.quantity}</span>
      ),
    },
    {
      key: 'totalAmount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      render: (customerReturn) => (
        <span className="font-medium text-gray-900">
          {formatCurrency(Number(customerReturn.totalAmount))}
        </span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (customerReturn) => (
        <span className="text-gray-700">
          {CUSTOMER_RETURN_REASON_LABELS[customerReturn.reason] ?? customerReturn.reason}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (customerReturn) => (
        <Badge className={getStatusStyle(customerReturn.status)}>
          {CUSTOMER_RETURN_STATUS_LABELS[customerReturn.status] ?? customerReturn.status}
        </Badge>
      ),
    },
  ]

  return (
    <ProtectedRoute requiredPermission="customer-return.view">
      <ModuleListShell
        title="Shop Returns"
        subtitle="Goods returned from shops — pending returns require approval before stock and ledger update."
        action={
          canCreate ? (
            <Button
              onClick={() => router.push(`${BASE_PATH}/create`)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Record Return
            </Button>
          ) : undefined
        }
        headerExtra={
          deliveryItemIdFilter ? (
            <p className="text-sm text-amber-800">
              Filtered to one delivery line.{' '}
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
        <DataTable<CustomerReturn>
          columns={columns}
          data={data?.data}
          meta={data?.meta}
          controller={controller}
          rowKey={(customerReturn) => customerReturn.id}
          isLoading={isLoading}
          isError={isError}
          errorMessage="Failed to load shop returns."
          searchPlaceholder="Search returns…"
          pageSizeOptions
          emptyMessage="No shop returns found matching your criteria."
          onRowClick={(customerReturn) => router.push(`${BASE_PATH}/${customerReturn.id}`)}
          actions={(customerReturn) => (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.push(`${BASE_PATH}/${customerReturn.id}`)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        />
      </ModuleListShell>
    </ProtectedRoute>
  )
}
