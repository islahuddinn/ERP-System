'use client'

import { useMemo, useState } from 'react'
import { Lock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable, applyClientPaging } from '@/hooks/useDataTable'
import { useUOMs, useDeleteUOM } from '@/hooks/useMasterData'
import type { UOM } from '@/hooks/useMasterData'
import { toast } from 'react-hot-toast'

const CATEGORY_LABELS: Record<string, string> = {
  WEIGHT: 'Weight',
  VOLUME: 'Volume',
  LENGTH: 'Length',
  COUNT: 'Count',
}

export default function UOMsPage() {
  const [deleteTarget, setDeleteTarget] = useState<UOM | null>(null)
  const controller = useDataTable({ initialSortBy: 'name', initialSortOrder: 'ASC' })
  const { data: uoms = [], isLoading, isError } = useUOMs()
  const deleteMutation = useDeleteUOM()

  const paged = applyClientPaging<UOM>(uoms as UOM[], controller, {
    search: (u) => `${u.name} ${u.symbol ?? ''} ${u.code}`,
    filters: {
      category: (u) => u.category,
    },
    sort: {
      name: (u) => u.name?.toLowerCase(),
      code: (u) => u.code?.toLowerCase(),
      // Issue 45: client-side sort accessors so the Symbol / Category header
      // icons actually sort (asc + desc). Category sorts by its display label.
      symbol: (u) => u.symbol?.toLowerCase() ?? '',
      category: (u) => (CATEGORY_LABELS[u.category] ?? u.category)?.toLowerCase(),
    },
  })

  const handleDelete = (uom: UOM) => {
    if (uom.isSystem) {
      toast.error('System UOMs cannot be deleted')
      return
    }
    setDeleteTarget(uom)
  }

  const handleDeleteConfirmed = async () => {
    if (!deleteTarget) return
    try {
      // Toasts (success + error) are owned by the useDeleteUOM hook — do not
      // fire them here as well, otherwise the alert shows twice (QA bug #1).
      await deleteMutation.mutateAsync(deleteTarget.id)
    } catch {
      // Swallow: the hook's onError already surfaced a toast. We only need to
      // reach the finally block to close the dialog.
    } finally {
      setDeleteTarget(null)
    }
  }

  // Category options are built ONCE from the FULL (unfiltered) UOM list — not
  // from the already-filtered/paged rows. Deriving from filtered rows collapsed
  // the option list to the single selected category (issue 48) and made the
  // selected label disappear after a no-result search (issue 49). Static options
  // keep every category available regardless of the active search/filter state.
  const categoryOptions = useMemo(() => {
    const map = new Map<string, string>()
    for (const u of uoms as UOM[]) {
      if (u.category) map.set(u.category, CATEGORY_LABELS[u.category] ?? u.category)
    }
    return Array.from(map, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label),
    )
  }, [uoms])

  const filters: DataTableFilter<UOM>[] = [
    {
      key: 'category',
      label: 'Category',
      options: categoryOptions,
    },
  ]

  const columns: DataTableColumn<UOM>[] = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      render: (u) => <span className="font-mono text-xs">{u.code}</span>,
    },
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (u) => <span className="font-medium">{u.name}</span>,
    },
    { key: 'symbol', header: 'Symbol', sortable: true, render: (u) => u.symbol ?? '—' },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      render: (u) => <span className="text-gray-600">{CATEGORY_LABELS[u.category] ?? u.category}</span>,
    },
    {
      key: 'type',
      header: 'Type',
      render: (u) =>
        u.isSystem ? <Badge variant="secondary">System</Badge> : <Badge variant="outline">Custom</Badge>,
    },
  ]

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Units of Measure</h2>
          <p className="text-muted-foreground">System-seeded UOMs. Custom UOMs can be deleted if not in use.</p>
        </div>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <DataTable<UOM>
            columns={columns}
            data={paged.data}
            meta={paged.meta}
            controller={controller}
            rowKey={(u) => u.id}
            isLoading={isLoading}
            isError={isError}
            searchable
            searchPlaceholder="Search name, symbol, code…"
            filters={filters}
            pageSizeOptions
            emptyMessage="No UOMs found"
            actionsHeader="Actions"
            actions={(uom) =>
              uom.isSystem ? (
                <Lock className="ml-auto h-4 w-4 text-muted-foreground" />
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(uom)}
                  disabled={deleteMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )
            }
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete UOM"
        description={`Delete "${deleteTarget?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
