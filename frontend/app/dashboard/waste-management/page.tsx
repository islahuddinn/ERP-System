'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, MoreVertical, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { formatCurrency } from '@/lib/currency'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
    useWasteManagement, useDeleteWaste,
    WasteType, WasteStatus, WasteRecord,
} from '@/hooks/useWasteManagement'
import { useProductsDropdown } from '@/hooks/useProducts'
import { useRawMaterialsDropdown } from '@/hooks/useRawMaterials'
import { useSitesDropdown } from '@/hooks/useSites'
import { format } from 'date-fns'

const WASTE_TYPE_STYLES: Record<WasteType, { className: string; label: string }> = {
    PRODUCTION: { className: 'bg-red-100 text-red-700', label: 'Production' },
    QUALITY_REJECT: { className: 'bg-orange-100 text-orange-700', label: 'Quality Reject' },
    EXPIRY: { className: 'bg-yellow-100 text-yellow-700', label: 'Expiry' },
    DAMAGE: { className: 'bg-purple-100 text-purple-700', label: 'Damage' },
    SPOILAGE: { className: 'bg-pink-100 text-pink-700', label: 'Spoilage' },
    OTHER: { className: 'bg-gray-100 text-gray-700', label: 'Other' },
}

const STATUS_STYLES: Record<WasteStatus, { className: string; label: string }> = {
    PENDING: { className: 'bg-amber-100 text-amber-700', label: 'Pending' },
    DISPOSED: { className: 'bg-gray-100 text-gray-600', label: 'Disposed' },
    RECYCLED: { className: 'bg-green-100 text-green-700', label: 'Recycled' },
    REUSED: { className: 'bg-blue-100 text-blue-700', label: 'Reused' },
}

export default function WasteManagementPage() {
    const router = useRouter()
    const controller = useDataTable({ initialSortBy: 'createdAt', initialSortOrder: 'DESC' })
    const [deleteTarget, setDeleteTarget] = useState<WasteRecord | null>(null)

    const { data: wasteData, isLoading, isError } = useWasteManagement({
        ...(controller.queryParams as any),
    })

    const deleteMutation = useDeleteWaste()
    const { data: products = [] } = useProductsDropdown()
    const { data: rawMaterials = [] } = useRawMaterialsDropdown()
    const { data: sites = [] } = useSitesDropdown()

    const records: WasteRecord[] = (wasteData as any)?.data ?? []
    const meta = (wasteData as any)?.meta ?? null

    const handleDelete = async () => {
        if (!deleteTarget) return
        await deleteMutation.mutateAsync(deleteTarget.id)
        setDeleteTarget(null)
    }

    const getItemDisplay = (record: WasteRecord) => {
        if (record.itemType === 'RAW_MATERIAL' && record.rawMaterial) {
            return (
                <div>
                    <p className="font-medium">{record.rawMaterial.name}</p>
                    <p className="text-xs text-gray-500">{record.rawMaterial.code}</p>
                </div>
            )
        }
        if (record.itemType === 'PRODUCT' && record.product) {
            return (
                <div>
                    <p className="font-medium">{record.product.name}</p>
                    <p className="text-xs text-gray-500">{record.product.code}</p>
                </div>
            )
        }
        return <span className="text-gray-400">N/A</span>
    }

    const filters: DataTableFilter<WasteRecord>[] = [
        {
            key: 'wasteType',
            label: 'Waste Type',
            options: [
                { value: 'PRODUCTION', label: 'Production' },
                { value: 'QUALITY_REJECT', label: 'Quality Reject' },
                { value: 'EXPIRY', label: 'Expiry' },
                { value: 'DAMAGE', label: 'Damage' },
                { value: 'SPOILAGE', label: 'Spoilage' },
                { value: 'OTHER', label: 'Other' },
            ],
        },
        {
            key: 'itemType',
            label: 'Item Type',
            options: [
                { value: 'RAW_MATERIAL', label: 'Raw Material' },
                { value: 'PRODUCT', label: 'Product' },
            ],
        },
        {
            key: 'status',
            label: 'Status',
            options: [
                { value: 'PENDING', label: 'Pending' },
                { value: 'DISPOSED', label: 'Disposed' },
                { value: 'RECYCLED', label: 'Recycled' },
                { value: 'REUSED', label: 'Reused' },
            ],
        },
        {
            key: 'productId',
            label: 'Product',
            searchable: true,
            options: (products as any[]).map((p) => ({ value: p.id, label: p.name })),
        },
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
        { type: 'daterange', label: 'Date range', fromKey: 'startDate', toKey: 'endDate' },
    ]

    const columns: DataTableColumn<WasteRecord>[] = [
        {
            key: 'wasteNumber',
            header: 'Waste #',
            sortable: true,
            render: (r) => <span className="font-medium text-green-700">{r.wasteNumber}</span>,
        },
        {
            key: 'wasteType',
            header: 'Type',
            sortable: true,
            render: (r) => {
                const s = WASTE_TYPE_STYLES[r.wasteType] || WASTE_TYPE_STYLES.OTHER
                return <Badge className={`font-medium whitespace-nowrap ${s.className}`}>{s.label}</Badge>
            },
        },
        { key: 'item', header: 'Item', render: getItemDisplay },
        {
            key: 'itemType',
            header: 'Item Type',
            render: (r) => (
                <Badge variant="outline" className="text-xs whitespace-nowrap">
                    {r.itemType === 'RAW_MATERIAL' ? 'Raw Material' : 'Product'}
                </Badge>
            ),
        },
        {
            key: 'quantity',
            header: 'Qty / Cost',
            align: 'right',
            sortable: true,
            render: (r) => (
                <>
                    <p className="font-semibold">{r.quantity}</p>
                    {r.cost != null && (
                        <p className="text-xs text-gray-500">{formatCurrency(Number(r.cost))}</p>
                    )}
                </>
            ),
        },
        {
            key: 'site',
            header: 'Site',
            render: (r) =>
                r.site ? <span className="text-gray-600">{r.site.name}</span> : <span className="text-gray-400">—</span>,
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            render: (r) => {
                const s = STATUS_STYLES[r.status] || STATUS_STYLES.PENDING
                return <Badge className={`font-medium whitespace-nowrap ${s.className}`}>{s.label}</Badge>
            },
        },
        {
            key: 'createdAt',
            header: 'Date',
            sortable: true,
            render: (r) => (
                <span className="text-gray-500 text-sm">{format(new Date(r.createdAt), 'MMM dd, yyyy')}</span>
            ),
        },
    ]

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-gray-900">Waste Management</h2>
                    <p className="text-gray-500">Record and track material and product waste events.</p>
                </div>
                <Button
                    onClick={() => router.push('/dashboard/waste-management/create')}
                    className="bg-green-600 hover:bg-green-700 text-white"
                >
                    <Plus className="mr-2 h-4 w-4" /> Record Waste
                </Button>
            </div>

            <Card className="bg-white border-gray-200 shadow-sm">
                <CardContent className="pt-6">
                    <DataTable<WasteRecord>
                        columns={columns}
                        data={records}
                        meta={meta}
                        controller={controller}
                        rowKey={(r) => r.id}
                        isLoading={isLoading}
                        isError={isError}
                        searchable
                        searchPlaceholder="Search by number or reason…"
                        filters={filters}
                        pageSizeOptions
                        emptyMessage="No waste records found."
                        actions={(record) => (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-8 w-8 p-0">
                                        <MoreVertical className="h-4 w-4 text-gray-500" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white border-gray-200 text-gray-900 shadow-lg backdrop-blur-none">
                                    <DropdownMenuLabel className="text-gray-900">Actions</DropdownMenuLabel>
                                    <DropdownMenuItem
                                        onClick={() => router.push(`/dashboard/waste-management/${record.id}`)}
                                        className="cursor-pointer"
                                    >
                                        View Details
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => setDeleteTarget(record)}
                                        className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                                    >
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    />
                </CardContent>
            </Card>

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Waste Record</AlertDialogTitle>
                        <AlertDialogDescription>
                            Delete <strong>{deleteTarget?.wasteNumber}</strong>? This soft-deletes the record.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
