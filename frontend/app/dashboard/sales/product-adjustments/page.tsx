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
  useProductAdjustments,
  PRODUCT_ADJUSTMENT_TYPE_LABELS,
  type ProductAdjustment,
  type ProductAdjustmentFilters,
  type ProductAdjustmentType,
} from '@/hooks/useProductAdjustments'

const BASE_PATH = '/dashboard/sales/product-adjustments'

const TYPE_TABS = [
  { value: 'all', label: 'All Adjustments' },
  { value: 'ADDITION', label: 'Additions' },
  { value: 'DEDUCTION', label: 'Deductions' },
]

function typeBadgeClass(type: ProductAdjustmentType) {
  return type === 'ADDITION'
    ? 'bg-blue-100 text-blue-800 border-blue-200'
    : 'bg-amber-100 text-amber-800 border-amber-200'
}

export default function ProductAdjustmentsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const customerIdFilter = searchParams.get('customerId') ?? undefined
  const { hasPermission } = usePermissionCheck()
  const canCreate = hasPermission('product-adjustment.create')

  const controller = useDataTable({
    initialSortBy: 'adjustedAt',
    initialSortOrder: 'DESC',
  })

  const typeTabs = useUrlStatusTabs({
    basePath: BASE_PATH,
    paramName: 'type',
    preserveParams: ['customerId'],
  })

  const queryParams = useListQueryParams(controller, typeTabs, {
    customerId: customerIdFilter,
  })

  const { data: adjustments, isLoading, isError, isFetching } = useProductAdjustments(
    queryParams as ProductAdjustmentFilters,
  )
  const adjustmentRows = adjustments?.data ?? []
  const adjustmentMeta = adjustments?.meta

  const columns: DataTableColumn<ProductAdjustment>[] = [
    {
      key: 'adjustmentNumber',
      header: 'Adjustment #',
      sortable: true,
      render: (row) => (
        <span className="font-mono text-sm font-medium text-gray-800">{row.adjustmentNumber}</span>
      ),
    },
    {
      key: 'adjustedAt',
      header: 'Date',
      sortable: true,
      render: (row) => (
        <span className="text-gray-700">{format(new Date(row.adjustedAt), 'MMM d, yyyy h:mm a')}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (row) => (
        <Badge variant="outline" className={typeBadgeClass(row.type)}>
          {PRODUCT_ADJUSTMENT_TYPE_LABELS[row.type]}
        </Badge>
      ),
    },
    {
      key: 'customer.shopName',
      header: 'Shop',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.customer?.shopName ?? '—'}</p>
          {row.customer?.code && <p className="text-xs text-gray-500">{row.customer.code}</p>}
        </div>
      ),
    },
    {
      key: 'product.name',
      header: 'Product',
      render: (row) => (
        <div>
          <p className="font-medium text-gray-900">{row.product?.name ?? '—'}</p>
          {row.product?.code && <p className="text-xs text-gray-500">{row.product.code}</p>}
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Qty',
      sortable: true,
      render: (row) => <span className="tabular-nums font-medium text-gray-800">{row.quantity}</span>,
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row) => <span className="text-gray-700 line-clamp-1">{row.reason}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`${BASE_PATH}/${row.id}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
      ),
    },
  ]

  return (
    <ProtectedRoute requiredPermission="product-adjustment.view">
      <ModuleListShell
        title="Shop Product Adjustments"
        subtitle="Record post-sale product quantity corrections. Audit documents only — stock and shop ledger are not changed."
        action={
          canCreate ? (
            <Button asChild className="bg-green-600 hover:bg-green-700 text-white">
              <Link href={`${BASE_PATH}/create`}>
                <Plus className="mr-2 h-4 w-4" />
                Record Adjustment
              </Link>
            </Button>
          ) : undefined
        }
        statusTabs={{
          value: typeTabs.value,
          onChange: typeTabs.onChange,
          tabs: TYPE_TABS,
        }}
      >
        <DataTable
          columns={columns}
          data={adjustmentRows}
          meta={adjustmentMeta}
          isLoading={isLoading && adjustmentRows.length === 0}
          isError={isError && !isFetching && adjustmentRows.length === 0}
          errorMessage="Failed to load product adjustments."
          controller={controller}
          rowKey={(row) => row.id}
          searchPlaceholder="Search by adjustment # or reason…"
          emptyMessage="No product adjustments yet."
          onRowClick={(row) => router.push(`${BASE_PATH}/${row.id}`)}
          pageSizeOptions
        />
      </ModuleListShell>
    </ProtectedRoute>
  )
}
