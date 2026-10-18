'use client'

import { useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Boxes, Eye, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ModuleStatusTabs } from '@/components/ui/module-status-tabs'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { useUrlStatusTabs, useListQueryParams } from '@/hooks/useUrlStatusTabs'
import {
  normalizeProductBatchIsFinal,
  normalizeProductBatchListStatus,
} from '@/lib/list-status-filters'
import {
  useProductBatches,
  useProductBatchStockSummary,
  useProductBatchStages,
  type ProductBatch,
} from '@/hooks/useProductBatches'
import { useProductsDropdown } from '@/hooks/useProducts'
import { useSitesDropdown } from '@/hooks/useSites'
import { formatCurrency } from '@/lib/currency'

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700 border-green-200',
  PARTIAL: 'bg-blue-100 text-blue-700 border-blue-200',
  CONSUMED: 'bg-gray-100 text-gray-700 border-gray-200',
  EXPIRED: 'bg-red-100 text-red-700 border-red-200',
  BLOCKED: 'bg-orange-100 text-orange-700 border-orange-200',
  QUARANTINE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
}

const money = (v: unknown) => formatCurrency(Number(v ?? 0))
const qty = (v: unknown) => Number(v ?? 0).toLocaleString('en-US')

const BASE_PATH = '/dashboard/product-batches'

const STATUS_TABS = [
  { value: 'all', label: 'All Batches' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PARTIAL', label: 'Partial' },
  { value: 'CONSUMED', label: 'Consumed' },
  { value: 'QUARANTINE', label: 'Quarantine' },
  { value: 'BLOCKED', label: 'Blocked' },
]

export default function ProductBatchesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const controller = useDataTable({ initialSortBy: 'createdAt', initialSortOrder: 'DESC' })

  const statusTabs = useUrlStatusTabs({
    basePath: BASE_PATH,
    preserveParams: ['isFinal'],
    normalizeValue: (raw) => normalizeProductBatchListStatus(raw) ?? raw,
  })

  const urlIsFinalFilter = useMemo(
    () => normalizeProductBatchIsFinal(searchParams.get('isFinal')),
    [searchParams],
  )

  const queryParams = useListQueryParams(controller, statusTabs, {
    isFinal: urlIsFinalFilter,
  })

  const { data: products = [] } = useProductsDropdown()
  const { data: sites = [] } = useSitesDropdown()
  const { data: stageOptions = [] } = useProductBatchStages()

  const { data, isLoading, isError } = useProductBatches(
    queryParams as Parameters<typeof useProductBatches>[0],
  )

  const batches = data?.data ?? []
  const meta = data?.meta

  const filters: DataTableFilter<ProductBatch>[] = [
    {
      key: 'productId',
      label: 'Product',
      searchable: true,
      options: products.map((p) => ({ value: p.id, label: `${p.name}${p.code ? ` (${p.code})` : ''}` })),
    },
    {
      key: 'siteId',
      label: 'Site',
      searchable: true,
      options: sites.map((s) => ({ value: s.id, label: `${s.name}${s.code ? ` (${s.code})` : ''}` })),
    },
    {
      // Static options sourced from GET /product-management/product-batches/stages (distinct stage
      // values across ALL batches). Deriving from the on-screen rows collapsed the
      // dropdown to the selected stage once picked, since the list is server-paginated.
      key: 'currentStage',
      label: 'Current Stage',
      searchable: true,
      options: stageOptions.map((s) => ({ value: s, label: s })),
    },
    { type: 'daterange', label: 'Date', fromKey: 'startDate', toKey: 'endDate' },
  ]

  const columns: DataTableColumn<ProductBatch>[] = [
    {
      // Sorting by 'batchNumber' is translated to createdAt on the backend
      // (product-batches.repository): PB-YYYYMM-NNNN sequences reset per month,
      // so lexical order isn't reliably chronological. DESC = newest batch first.
      key: 'batchNumber',
      header: 'Batch #',
      sortable: true,
      render: (b) => <span className="font-medium text-gray-900 font-mono">{b.batchNumber}</span>,
    },
    {
      key: 'product',
      header: 'Product',
      render: (b) => (
        <div className="flex flex-col">
          <span>{b.product?.name ?? '—'}</span>
          {b.product?.code && <span className="text-xs text-gray-500 font-mono">{b.product.code}</span>}
        </div>
      ),
    },
    {
      key: 'currentStage',
      header: 'Stage',
      sortable: true,
      render: (b) => (
        <div className="flex items-center gap-2">
          <span>{b.currentStage}</span>
          {b.isFinal && <Badge variant="outline" className="text-[10px] border-green-300 text-green-700">Final</Badge>}
        </div>
      ),
    },
    {
      key: 'availableQuantity',
      header: 'Available',
      align: 'right',
      sortable: true,
      render: (b) => qty(b.availableQuantity),
    },
    {
      key: 'costPerUnit',
      header: 'Cost / Unit',
      align: 'right',
      sortable: true,
      render: (b) => money(b.costPerUnit),
    },
    {
      key: 'productionOrder',
      header: 'Production Order',
      render: (b) => <span className="font-mono text-xs text-gray-600">{b.productionOrder?.orderNumber ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => (
        <Badge className={`font-medium ${STATUS_STYLES[b.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {b.status}
        </Badge>
      ),
    },
  ]

  return (
    <ProtectedRoute>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Boxes className="h-8 w-8 text-green-600" />
              Product Batches
            </h1>
            <p className="text-gray-600 mt-1">Finished-good and work-in-progress batches created by production orders</p>
          </div>
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
            <DataTable<ProductBatch>
              columns={columns}
              data={batches}
              meta={meta}
              controller={controller}
              rowKey={(b) => b.id}
              isLoading={isLoading}
              isError={isError}
              searchable
              searchPlaceholder="Search by batch number…"
              filters={filters}
              pageSizeOptions
              emptyMessage="No product batches found"
              onRowClick={(b) => router.push(`/dashboard/product-batches/${b.id}`)}
              actions={(b) => (
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/dashboard/product-batches/${b.id}`)}>
                  <Eye className="h-4 w-4" />
                </Button>
              )}
            />
          </CardContent>
        </Card>

        <ProductStockSummary />
      </div>
    </ProtectedRoute>
  )
}

/**
 * Product Stock Summary (QA #51) — stage-wise breakdown for a selected product,
 * sourced from GET /product-management/product-batches/stock-summary/:productId. Shows Product,
 * Stage, Quantity, Batch Count and Final Status.
 */
function ProductStockSummary() {
  const { data: products = [] } = useProductsDropdown()
  const [productId, setProductId] = useState<string>('')
  const { data: summary = [], isLoading } = useProductBatchStockSummary(productId || undefined)

  const selectedProduct = products.find(p => p.id === productId)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
        <CardTitle className="text-base">Product Stock Summary</CardTitle>
        <Select value={productId} onValueChange={setProductId}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select a product" /></SelectTrigger>
          <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
            {products.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}{p.code ? ` (${p.code})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead>Product</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Batch Count</TableHead>
              <TableHead>Final Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!productId ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-gray-500">Select a product to view its stock summary</TableCell></TableRow>
            ) : isLoading ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-gray-400" /></TableCell></TableRow>
            ) : summary.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-gray-500">No stock recorded for this product</TableCell></TableRow>
            ) : summary.map((row, i) => (
              <TableRow key={`${row.stage}-${row.isFinal}-${i}`}>
                <TableCell>{selectedProduct?.name ?? '—'}</TableCell>
                <TableCell>{row.stage}</TableCell>
                <TableCell className="text-right">{qty(row.quantity)}</TableCell>
                <TableCell className="text-right">{qty(row.batchCount)}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={row.isFinal ? 'border-green-300 text-green-700' : 'border-blue-300 text-blue-700'}>
                    {row.isFinal ? 'Final' : 'Work In Progress'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
