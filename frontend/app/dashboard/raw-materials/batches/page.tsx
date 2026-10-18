'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, Package } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { useRawMaterialBatches } from '@/hooks/useRawMaterialBatches'
import { useRawMaterialsDropdown } from '@/hooks/useRawMaterials'
import { useSitesDropdown } from '@/hooks/useSites'
import { useGrns, type Grn } from '@/hooks/useMaterialReceiving'
import type { RawMaterialBatch } from '@/types/common'

const STATUS_BADGE: Record<string, string> = {
  ACTIVE:     'bg-green-100 text-green-800 border-green-200 hover:bg-green-100',
  PARTIAL:    'bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-100',
  CONSUMED:   'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-100',
  EXPIRED:    'bg-red-100 text-red-700 border-red-200 hover:bg-red-100',
  BLOCKED:    'bg-red-100 text-red-700 border-red-200 hover:bg-red-100',
  QUARANTINE: 'bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-100',
}

export default function BatchesListPage() {
  const router = useRouter()
  const controller = useDataTable({ initialSortBy: 'createdAt', initialSortOrder: 'DESC' })

  const { data: rawMaterials = [] } = useRawMaterialsDropdown()
  const { data: sites = [] } = useSitesDropdown()
  const { data: grnData } = useGrns({ limit: 100 })
  const grns: Grn[] = grnData?.data ?? []

  // "Expiring in days" is a bounded numeric input (QA #15) — kept as a custom
  // toolbar control since DataTable has no numeric-range filter type. Only a valid
  // 1–365 value is pushed to the query; anything else is flagged and never sent.
  const [expiringDays, setExpiringDays] = useState('')
  const parsedExpiringDays = expiringDays ? parseInt(expiringDays, 10) : undefined
  const expiringDaysInvalid =
    expiringDays.trim() !== '' &&
    (parsedExpiringDays === undefined ||
      Number.isNaN(parsedExpiringDays) ||
      parsedExpiringDays < 1 ||
      parsedExpiringDays > 365)

  useEffect(() => {
    const valid = !expiringDaysInvalid && parsedExpiringDays && !Number.isNaN(parsedExpiringDays)
    controller.setFilter('expiringDays', valid ? String(parsedExpiringDays) : undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expiringDays])

  // Keep the input in sync when the shared Clear button drops the filter.
  useEffect(() => {
    if (!controller.filters.expiringDays && expiringDays && !expiringDaysInvalid) {
      setExpiringDays('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [controller.filters.expiringDays])

  const { data: responseData, isLoading, isError } = useRawMaterialBatches({
    ...(controller.queryParams as any),
  })

  const batches: RawMaterialBatch[] = responseData?.data ?? []
  const meta = responseData?.meta ?? null

  const filters: DataTableFilter<RawMaterialBatch>[] = [
    {
      key: 'rawMaterialId',
      label: 'Raw Material',
      searchable: true,
      options: (rawMaterials as any[]).map((rm) => ({ value: rm.id, label: rm.name })),
    },
    {
      key: 'siteId',
      label: 'Site',
      options: (sites as any[]).map((s) => ({ value: s.id, label: s.name })),
    },
    {
      key: 'grnId',
      label: 'GRN',
      searchable: true,
      options: grns.map((g) => ({ value: g.id, label: g.receivingNumber })),
    },
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'ACTIVE', label: 'Active' },
        { value: 'PARTIAL', label: 'Partial' },
        { value: 'CONSUMED', label: 'Consumed' },
        { value: 'EXPIRED', label: 'Expired' },
        { value: 'BLOCKED', label: 'Blocked' },
        { value: 'QUARANTINE', label: 'Quarantine' },
      ],
    },
    { type: 'daterange', label: 'Received Date', fromKey: 'startDate', toKey: 'endDate' },
  ]

  const columns: DataTableColumn<RawMaterialBatch>[] = [
    {
      key: 'batchNumber',
      header: 'Batch Number',
      sortable: true,
      render: (b) => <span className="font-mono text-sm font-medium">{b.batchNumber}</span>,
    },
    {
      key: 'rawMaterial',
      header: 'Raw Material',
      sortable: true,
      sortKey: 'rawMaterial.name',
      render: (b) => b.rawMaterial?.name ?? '—',
    },
    {
      key: 'site',
      header: 'Site',
      sortable: true,
      sortKey: 'site.name',
      render: (b) => b.site?.name ?? '—',
    },
    { key: 'receivedQuantity', header: 'Received', align: 'right', sortable: true, sortKey: 'receivedQuantity' },
    { key: 'consumedQuantity', header: 'Consumed', align: 'right', sortable: true, sortKey: 'consumedQuantity' },
    {
      key: 'availableQuantity',
      header: 'Available',
      align: 'right',
      sortable: true,
      render: (b) => <span className="font-medium">{b.availableQuantity}</span>,
    },
    {
      key: 'manufacturingDate',
      header: 'Manufacture Date',
      sortable: true,
      render: (b) =>
        b.manufacturingDate ? (
          <span className="text-sm">{new Date(b.manufacturingDate).toLocaleDateString()}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'expiryDate',
      header: 'Expiry',
      sortable: true,
      render: (b) =>
        b.expiryDate ? (
          <span className="text-sm">{new Date(b.expiryDate).toLocaleDateString()}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      sortKey: 'status',
      render: (b) => <Badge className={STATUS_BADGE[b.status] ?? ''}>{b.status}</Badge>,
    },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2 text-gray-900">
            <Package className="h-7 w-7 text-green-600" />
            Raw Material Batches
          </h2>
          <p className="text-muted-foreground">Track and manage inventory batches</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <DataTable<RawMaterialBatch>
            columns={columns}
            data={batches}
            meta={meta}
            controller={controller}
            rowKey={(b) => b.id}
            isLoading={isLoading}
            isError={isError}
            searchable
            searchPlaceholder="Search batch number…"
            filters={filters}
            pageSizeOptions
            emptyMessage="No batches found"
            onRowClick={(b) => router.push(`/dashboard/raw-materials/batches/${b.id}`)}
            toolbarRight={
              <div className="flex flex-col">
                <Input
                  type="number"
                  min={1}
                  max={365}
                  placeholder="Expiring in days"
                  aria-label="Expiring within days"
                  aria-invalid={expiringDaysInvalid}
                  className={`w-40 ${expiringDaysInvalid ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                  value={expiringDays}
                  onChange={(e) => setExpiringDays(e.target.value)}
                />
                {expiringDaysInvalid && (
                  <p className="text-xs text-destructive mt-1 w-40">
                    Enter a whole number between 1 and 365.
                  </p>
                )}
              </div>
            }
            actions={(b) => (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/dashboard/raw-materials/batches/${b.id}`)}
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
          />
        </CardContent>
      </Card>
    </div>
  )
}
