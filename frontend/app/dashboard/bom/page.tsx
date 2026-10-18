'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ModuleStatusTabs } from '@/components/ui/module-status-tabs'
import { FileText, Plus, Eye, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { useUrlStatusTabs, useListQueryParams } from '@/hooks/useUrlStatusTabs'
import { normalizeBomListStatus } from '@/lib/list-status-filters'
import { useBoms, useDeleteBom, type Bom, type BomStatus } from '@/hooks/useBom'
import { useProducts, type Product } from '@/hooks/useProducts'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const BASE_PATH = '/dashboard/bom'

const STATUS_TABS = [
    { value: 'all', label: 'All BOMs' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INACTIVE', label: 'Inactive' },
]

const STATUS_STYLES: Record<BomStatus, { className: string; label: string }> = {
    DRAFT: { className: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Draft' },
    ACTIVE: { className: 'bg-green-100 text-green-700 border-green-200', label: 'Active' },
    INACTIVE: { className: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Inactive' },
}

export default function BomPage() {
    const router = useRouter()
    const controller = useDataTable({ initialSortBy: 'createdAt', initialSortOrder: 'DESC' })

    const statusTabs = useUrlStatusTabs({
        basePath: BASE_PATH,
        normalizeValue: (raw) => normalizeBomListStatus(raw) ?? raw,
    })

    const queryParams = useListQueryParams(controller, statusTabs)

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
    const [bomToDelete, setBomToDelete] = useState<string | null>(null)

    const { data, isLoading, isError } = useBoms(queryParams as Parameters<typeof useBoms>[0])
    const deleteMutation = useDeleteBom()

    const boms: Bom[] = data?.data ?? []
    const meta = data?.meta

    // Load only ACTIVE products for the filter dropdown so it surfaces product
    // names, not raw IDs. BOMs are only created for active products.
    const { data: productsResponse } = useProducts({ limit: 200, isActive: true })
    const products = useMemo<Product[]>(() => {
        if (!productsResponse) return []
        const raw = (productsResponse as any).data ?? productsResponse
        if (Array.isArray(raw)) return raw
        if (Array.isArray((raw as any).data)) return (raw as any).data
        return []
    }, [productsResponse])

    const handleDeleteConfirm = async () => {
        if (!bomToDelete) return
        await deleteMutation.mutateAsync(bomToDelete)
        setDeleteDialogOpen(false)
        setBomToDelete(null)
    }

    const filters: DataTableFilter<Bom>[] = [
        {
            key: 'productId',
            label: 'Product',
            searchable: true,
            options: products.map((p) => ({ value: p.id, label: `${p.name}${p.code ? ` (${p.code})` : ''}` })),
        },
        { type: 'daterange', label: 'Created', fromKey: 'startDate', toKey: 'endDate' },
    ]

    const columns: DataTableColumn<Bom>[] = [
        {
            key: 'bomNumber',
            header: 'BOM No.',
            sortable: true,
            render: (bom) => <span className="font-mono font-medium text-gray-900">{bom.bomNumber}</span>,
        },
        {
            key: 'name',
            header: 'Name',
            sortable: true,
            render: (bom) => <span className="font-medium text-gray-900">{bom.name}</span>,
        },
        {
            key: 'product',
            header: 'Product',
            render: (bom) => (
                <div className="flex flex-col">
                    <span>{bom.product?.name ?? '—'}</span>
                    {bom.product?.code && <span className="text-xs text-gray-400 font-mono">{bom.product.code}</span>}
                </div>
            ),
        },
        {
            key: 'items',
            header: 'Materials',
            render: (bom) => <span className="text-gray-600">{bom.items?.length ?? 0}</span>,
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            render: (bom) => (
                <Badge variant="outline" className={STATUS_STYLES[bom.status]?.className}>
                    {STATUS_STYLES[bom.status]?.label ?? bom.status}
                </Badge>
            ),
        },
        {
            key: 'updatedAt',
            header: 'Updated',
            sortable: true,
            render: (bom) => <span className="text-gray-600">{format(new Date(bom.updatedAt), 'MMM dd, yyyy')}</span>,
        },
    ]

    return (
        <ProtectedRoute requiredPermission="bom.read">
            <div className="factory-section">
                <div className="factory-page-container">
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                                    <FileText className="h-8 w-8 text-green-600" />
                                    Bill of Materials
                                </h1>
                                <p className="text-gray-600 mt-1">Manage product assembly specifications and raw material requirements</p>
                            </div>
                            <Button
                                onClick={() => router.push('/dashboard/bom/create')}
                                className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Create BOM
                            </Button>
                        </div>

                        <Card className="bg-white border border-gray-200 shadow-sm overflow-hidden">
                            <CardHeader className="pb-3">
                                <ModuleStatusTabs
                                    value={statusTabs.value}
                                    onChange={statusTabs.onChange}
                                    tabs={STATUS_TABS}
                                />
                            </CardHeader>
                            <CardContent className="pt-0 p-4">
                                <DataTable<Bom>
                                    columns={columns}
                                    data={boms}
                                    meta={meta}
                                    controller={controller}
                                    rowKey={(bom) => bom.id}
                                    isLoading={isLoading}
                                    isError={isError}
                                    errorMessage="Failed to load BOMs."
                                    searchable
                                    searchPlaceholder="Search BOM number or name..."
                                    filters={filters}
                                    pageSizeOptions
                                    emptyMessage="No BOMs found. Try adjusting your filters or create a new BOM."
                                    onRowClick={(bom) => router.push(`/dashboard/bom/${bom.id}`)}
                                    actions={(bom) => (
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => router.push(`/dashboard/bom/${bom.id}`)}
                                                className="text-gray-600 hover:text-green-600"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {bom.status !== 'ACTIVE' && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => { setBomToDelete(bom.id); setDeleteDialogOpen(true) }}
                                                    className="text-gray-600 hover:text-red-600"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete BOM</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure? Only DRAFT or INACTIVE BOMs can be deleted. This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ProtectedRoute>
    )
}
