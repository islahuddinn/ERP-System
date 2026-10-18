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
import { usePermissionCheck } from '@/hooks/usePermissionCheck'
import {
  useCustomerRecoveries,
  formatRecoverySalesPersonName,
  RECOVERY_PAYMENT_MODE_LABELS,
  type CustomerRecovery,
} from '@/hooks/useCustomerRecovery'
import { formatCurrency } from '@/lib/currency'

const BASE_PATH = '/dashboard/sales/customer-recovery'

export default function CustomerRecoveryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const customerIdFilter = searchParams.get('customerId') ?? undefined
  const { hasPermission } = usePermissionCheck()
  const canCreate = hasPermission('customer-recovery.create')

  const controller = useDataTable({
    initialSortBy: 'collectedAt',
    initialSortOrder: 'DESC',
    initialFilters: customerIdFilter ? { customerId: customerIdFilter } : undefined,
  })

  const { data, isLoading, isError } = useCustomerRecoveries(
    controller.queryParams as Record<string, string | number>,
  )

  const columns: DataTableColumn<CustomerRecovery>[] = [
    {
      key: 'recoveryNumber',
      header: 'Recovery #',
      sortable: true,
      render: (recovery) => (
        <span className="font-mono text-sm font-medium text-gray-800">{recovery.recoveryNumber}</span>
      ),
    },
    {
      key: 'collectedAt',
      header: 'Collected',
      sortable: true,
      render: (recovery) => (
        <span className="text-gray-700">
          {format(new Date(recovery.collectedAt), 'MMM d, yyyy h:mm a')}
        </span>
      ),
    },
    {
      key: 'customer.shopName',
      header: 'Shop',
      render: (recovery) => (
        <div>
          <p className="font-medium text-gray-900">{recovery.customer?.shopName ?? '—'}</p>
          {recovery.customer?.code && (
            <p className="text-xs text-gray-500">{recovery.customer.code}</p>
          )}
        </div>
      ),
    },
    {
      key: 'salesPerson',
      header: 'Collected By',
      render: (recovery) => (
        <span className="text-gray-700">{formatRecoverySalesPersonName(recovery.salesPerson)}</span>
      ),
    },
    {
      key: 'paymentMode',
      header: 'Payment Mode',
      render: (recovery) => (
        <Badge variant="outline" className="font-normal">
          {RECOVERY_PAYMENT_MODE_LABELS[recovery.paymentMode] ?? recovery.paymentMode}
        </Badge>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      align: 'right',
      sortable: true,
      render: (recovery) => (
        <span className="font-medium text-green-700 tabular-nums">
          {formatCurrency(Number(recovery.amount))}
        </span>
      ),
    },
  ]

  return (
    <ProtectedRoute requiredPermission="customer-recovery.view">
      <ModuleListShell
        title="Shop Recovery"
        subtitle="Payments collected from shops by sales people — credits the shop ledger and the collector's cash-in-hand immediately."
        action={
          canCreate ? (
            <Button
              onClick={() =>
                router.push(
                  customerIdFilter
                    ? `${BASE_PATH}/create?customerId=${customerIdFilter}`
                    : `${BASE_PATH}/create`,
                )
              }
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Record Recovery
            </Button>
          ) : undefined
        }
        headerExtra={
          customerIdFilter ? (
            <p className="text-sm text-amber-800">
              Filtered to one shop.{' '}
              <Link href={BASE_PATH} className="underline font-medium">
                Clear filter
              </Link>
            </p>
          ) : undefined
        }
      >
        <DataTable<CustomerRecovery>
          columns={columns}
          data={data?.data}
          meta={data?.meta}
          controller={controller}
          rowKey={(recovery) => recovery.id}
          isLoading={isLoading}
          isError={isError}
          errorMessage="Failed to load shop recoveries."
          searchPlaceholder="Search recoveries…"
          pageSizeOptions
          emptyMessage="No shop recoveries found matching your criteria."
          onRowClick={(recovery) => router.push(`${BASE_PATH}/${recovery.id}`)}
          actions={(recovery) => (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => router.push(`${BASE_PATH}/${recovery.id}`)}
            >
              <Eye className="h-4 w-4" />
            </Button>
          )}
        />
      </ModuleListShell>
    </ProtectedRoute>
  )
}
