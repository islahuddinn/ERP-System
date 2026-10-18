'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Edit, Trash2, AlertTriangle, Package } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { useRawMaterials, useDeleteRawMaterial } from '@/hooks/useRawMaterials'
import { useUOMsDropdown } from '@/hooks/useMasterData'
import { getApiErrorMessage } from '@/lib/api-error'
import { formatCurrency } from '@/lib/currency'
import type { RawMaterial } from '@/types/common'
import { toast } from 'react-hot-toast'

export default function RawMaterialsPage() {
  const router = useRouter()
  const controller = useDataTable({ initialLimit: 10 })
  const [deleteTarget, setDeleteTarget] = useState<RawMaterial | null>(null)

  // Server mode — the backend paginates/searches/sorts, so the list is never truncated.
  const { data: responseData, isLoading, isError } = useRawMaterials({ ...(controller.queryParams as any) })

  const deleteMutation = useDeleteRawMaterial()
  // Unit (UOM) filter — GET /api/raw-materials supports a `uomId` filter param, so the
  // dropdown is backed by a real API filter (options come from the UOM dropdown).
  const { data: uoms = [] } = useUOMsDropdown()

  const materials: RawMaterial[] = responseData?.data ?? []
  const meta = responseData?.meta

  const filters: DataTableFilter<RawMaterial>[] = [
    {
      key: 'uomId',
      label: 'Unit',
      searchable: true,
      options: (uoms as any[]).map((u) => ({
        value: u.id,
        label: u.symbol ? `${u.name} (${u.symbol})` : u.name,
      })),
    },
  ]

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to delete'))
    } finally {
      setDeleteTarget(null)
    }
  }

  const columns: DataTableColumn<RawMaterial>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (rm) => (
        <span className="font-medium">
          {rm.currentStock <= rm.reorderLevel && (
            <AlertTriangle className="h-3 w-3 text-amber-500 inline mr-1" />
          )}
          {rm.name}
        </span>
      ),
    },
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      render: (rm) => <span className="font-mono text-xs">{rm.code}</span>,
    },
    {
      key: 'uom',
      header: 'UOM',
      sortable: true,
      sortKey: 'uom.name',
      render: (rm) => rm.uom?.symbol ?? '—',
    },
    {
      key: 'currentStock',
      header: 'Stock',
      sortable: true,
      render: (rm) =>
        rm.currentStock <= 0 ? (
          <Badge variant="destructive">0</Badge>
        ) : rm.currentStock <= rm.reorderLevel ? (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
            {Number(rm.currentStock).toFixed(2)}
          </Badge>
        ) : (
          <span>{Number(rm.currentStock).toFixed(2)}</span>
        ),
    },
    { key: 'reorderLevel', header: 'Reorder', sortable: true },
    {
      key: 'lastPurchasePrice',
      header: 'Last Price',
      sortable: true,
      render: (rm) => (rm.lastPurchasePrice ? formatCurrency(parseFloat(rm.lastPurchasePrice)) : '—'),
    },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Raw Materials</h2>
          <p className="text-muted-foreground">Manage raw material master catalogue</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="text-gray-900" onClick={() => router.push('/dashboard/raw-materials/batches')}>
            <Package className="h-4 w-4 mr-2" /> Raw Material Batches
          </Button>
          <Button onClick={() => router.push('/dashboard/raw-materials/add')}>
            <Plus className="h-4 w-4 mr-2" /> Add Raw Material
          </Button>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <DataTable<RawMaterial>
            columns={columns}
            data={materials}
            meta={meta}
            controller={controller}
            rowKey={(rm) => rm.id}
            isLoading={isLoading}
            isError={isError}
            searchable
            filters={filters}
            searchPlaceholder="Search name, code…"
            pageSizeOptions
            emptyMessage="No raw materials found"
            onRowClick={(rm) => router.push(`/dashboard/raw-materials/${rm.id}`)}
            actions={(rm) => (
              <div className="flex gap-1 justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => router.push(`/dashboard/raw-materials/${rm.id}/edit`)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeleteTarget(rm)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Raw Material"
        description={`Delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
