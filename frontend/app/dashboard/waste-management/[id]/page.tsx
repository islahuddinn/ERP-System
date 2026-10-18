'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Save, Trash2, Edit, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/currency'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
    useWasteRecord, useUpdateWaste, useDeleteWaste,
    WasteType, WasteStatus, UpdateWasteDto,
} from '@/hooks/useWasteManagement'
import { useSitesDropdown } from '@/hooks/useSites'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import { toast } from 'react-hot-toast'
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

export default function WasteRecordDetailPage() {
    const router = useRouter()
    const params = useParams()
    const wasteId = params?.id as string

    const { data: record, isLoading } = useWasteRecord(wasteId)
    const updateMutation = useUpdateWaste()
    const deleteMutation = useDeleteWaste()

    const { data: sitesData } = useSitesDropdown()
    // Drop empty-id rows so Radix <SelectItem> can't crash the screen (#9).
    const sites = (Array.isArray(sitesData) ? sitesData : []).filter((x: any) => x?.id)

    const [isEditing, setIsEditing] = useState(false)
    const [showDeleteDialog, setShowDeleteDialog] = useState(false)
    const [resolveStatus, setResolveStatus] = useState<'DISPOSED' | 'RECYCLED' | 'REUSED'>('DISPOSED')
    const [showResolveDialog, setShowResolveDialog] = useState(false)

    const [editForm, setEditForm] = useState({
        wasteType: 'PRODUCTION' as WasteType,
        reason: '',
        remarks: '',
        siteId: '',
    })

    useEffect(() => {
        if (record) {
            setEditForm({
                wasteType: record.wasteType,
                reason: record.reason,
                remarks: record.remarks ?? '',
                siteId: record.siteId ?? '',
            })
        }
    }, [record])

    const handleSave = async () => {
        // #26 — Reason is required; block submit when empty.
        if (!editForm.reason.trim()) {
            toast.error('Reason is required')
            return
        }
        const dto: UpdateWasteDto = {
            wasteType: editForm.wasteType,
            reason: editForm.reason.trim(),
            // #21 — send explicit empty string so a cleared Remarks persists.
            remarks: editForm.remarks.trim() === '' ? '' : editForm.remarks,
            siteId: editForm.siteId || undefined,
        }
        try {
            await updateMutation.mutateAsync({ wasteId, dto })
            setIsEditing(false)
            // #22 — go back to the list, not the details screen.
            router.push('/dashboard/waste-management')
        } catch {
            // Error handled by hook
        }
    }

    const handleResolve = async () => {
        try {
            await updateMutation.mutateAsync({ wasteId, dto: { status: resolveStatus } })
            setShowResolveDialog(false)
        } catch {
            // Error handled by hook
        }
    }

    const handleDelete = async () => {
        try {
            await deleteMutation.mutateAsync(wasteId)
            router.push('/dashboard/waste-management')
        } catch {
            // Error handled by hook
        }
    }

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center h-64">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-green-600 border-t-transparent" />
            </div>
        )
    }

    if (!record) {
        return (
            <div className="flex-1 p-8 text-center">
                <p className="text-gray-500">Waste record not found.</p>
                <Button variant="outline" className="mt-4" onClick={() => router.push('/dashboard/waste-management')}>
                    Back to Waste Management
                </Button>
            </div>
        )
    }

    const typeStyle = WASTE_TYPE_STYLES[record.wasteType] || WASTE_TYPE_STYLES.OTHER
    const statusStyle = STATUS_STYLES[record.status] || STATUS_STYLES.PENDING
    const isPending = record.status === 'PENDING'

    const itemName = record.itemType === 'RAW_MATERIAL'
        ? record.rawMaterial?.name
        : record.product?.name
    const itemCode = record.itemType === 'RAW_MATERIAL'
        ? record.rawMaterial?.code
        : record.product?.code

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.back()}
                    className="text-gray-500 hover:text-green-600"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h2 className="text-3xl font-bold text-gray-900">
                        {isEditing ? 'Edit Waste Record' : 'Waste Record'}
                    </h2>
                    <p className="text-gray-500">{record.wasteNumber}</p>
                </div>
                {!isEditing && (
                    <div className="flex gap-2">
                        {isPending && (
                            <Button
                                variant="outline"
                                onClick={() => setShowResolveDialog(true)}
                                className="border-green-200 text-green-700 hover:bg-green-50"
                            >
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Resolve
                            </Button>
                        )}
                        <Button variant="outline" onClick={() => setIsEditing(true)}>
                            <Edit className="mr-2 h-4 w-4" /> Edit
                        </Button>
                        <ViewHistoryButton entityName="WasteManagement" entityId={wasteId} size="default" />
                        <Button
                            variant="outline"
                            onClick={() => setShowDeleteDialog(true)}
                            className="text-red-600 hover:text-red-700 border-red-200"
                        >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                    </div>
                )}
            </div>

            <div className="mx-auto max-w-4xl space-y-6">
                {/* Overview */}
                <Card className="bg-white border-gray-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-gray-900">
                            <Trash2 className="h-5 w-5 text-red-600" />
                            Overview
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <Label className="text-gray-500 text-sm">Waste Number</Label>
                            <p className="font-semibold text-green-700">{record.wasteNumber}</p>
                        </div>
                        <div>
                            <Label className="text-gray-500 text-sm">Status</Label>
                            <div className="mt-1">
                                <Badge className={`font-medium ${statusStyle.className}`}>
                                    {statusStyle.label}
                                </Badge>
                            </div>
                        </div>
                        <div>
                            <Label className="text-gray-500 text-sm">Waste Type</Label>
                            {isEditing ? (
                                <Select
                                    value={editForm.wasteType}
                                    onValueChange={(v) => setEditForm({ ...editForm, wasteType: v as WasteType })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PRODUCTION">Production</SelectItem>
                                        <SelectItem value="QUALITY_REJECT">Quality Reject</SelectItem>
                                        <SelectItem value="EXPIRY">Expiry</SelectItem>
                                        <SelectItem value="DAMAGE">Damage</SelectItem>
                                        <SelectItem value="SPOILAGE">Spoilage</SelectItem>
                                        <SelectItem value="OTHER">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            ) : (
                                <div className="mt-1">
                                    <Badge className={`font-medium ${typeStyle.className}`}>
                                        {typeStyle.label}
                                    </Badge>
                                </div>
                            )}
                        </div>
                        <div>
                            <Label className="text-gray-500 text-sm">Item Type</Label>
                            <p className="font-medium">
                                {record.itemType === 'RAW_MATERIAL' ? 'Raw Material' : 'Product'}
                            </p>
                        </div>
                        <div>
                            <Label className="text-gray-500 text-sm">Item</Label>
                            <p className="font-medium">{itemName ?? 'N/A'}</p>
                            {itemCode && <p className="text-xs text-gray-500">{itemCode}</p>}
                        </div>
                        <div>
                            <Label className="text-gray-500 text-sm">Quantity</Label>
                            <p className="font-medium">{record.quantity}</p>
                        </div>
                        <div>
                            <Label className="text-gray-500 text-sm">Cost</Label>
                            <p className="font-medium">
                                {record.cost != null ? formatCurrency(Number(record.cost)) : 'Auto-calculated'}
                            </p>
                        </div>
                        <div>
                            <Label className="text-gray-500 text-sm">Site</Label>
                            {isEditing ? (
                                <Select
                                    value={editForm.siteId}
                                    onValueChange={(v) => setEditForm({ ...editForm, siteId: v === '_none' ? '' : v })}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="No site" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="_none">No site</SelectItem>
                                        {sites.map((site: any) => (
                                            <SelectItem key={site.id} value={site.id}>
                                                {site.name} ({site.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <p className="font-medium">{record.site?.name ?? '—'}</p>
                            )}
                        </div>
                        {record.resolvedAt && (
                            <div>
                                <Label className="text-gray-500 text-sm">Resolved At</Label>
                                <p className="font-medium">{format(new Date(record.resolvedAt), 'MMM dd, yyyy HH:mm')}</p>
                            </div>
                        )}
                        <div>
                            <Label className="text-gray-500 text-sm">Created</Label>
                            <p className="font-medium">{format(new Date(record.createdAt), 'MMM dd, yyyy HH:mm')}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Reason & Remarks */}
                <Card className="bg-white border-gray-200 shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-gray-900">Reason & Remarks</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label className="text-gray-500 text-sm">Reason *</Label>
                            {isEditing ? (
                                <Textarea
                                    value={editForm.reason}
                                    onChange={(e) => setEditForm({ ...editForm, reason: e.target.value })}
                                    className="mt-1"
                                    rows={3}
                                />
                            ) : (
                                <p className="mt-1 whitespace-pre-wrap text-gray-700">{record.reason || '—'}</p>
                            )}
                        </div>
                        <div>
                            <Label className="text-gray-500 text-sm">Remarks</Label>
                            {isEditing ? (
                                <Textarea
                                    value={editForm.remarks}
                                    onChange={(e) => setEditForm({ ...editForm, remarks: e.target.value })}
                                    placeholder="Additional notes..."
                                    className="mt-1"
                                    rows={2}
                                />
                            ) : (
                                <p className="mt-1 whitespace-pre-wrap text-gray-700">{record.remarks || '—'}</p>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Edit actions */}
                {isEditing && (
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsEditing(false)
                                if (record) {
                                    setEditForm({
                                        wasteType: record.wasteType,
                                        reason: record.reason,
                                        remarks: record.remarks ?? '',
                                        siteId: record.siteId ?? '',
                                    })
                                }
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={updateMutation.isPending}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {updateMutation.isPending ? 'Saving...' : (
                                <><Save className="mr-2 h-4 w-4" /> Save Changes</>
                            )}
                        </Button>
                    </div>
                )}
            </div>

            {/* Resolve dialog */}
            <AlertDialog
                open={showResolveDialog}
                onOpenChange={(open) => {
                    setShowResolveDialog(open)
                    if (!open) setResolveStatus('DISPOSED')
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Resolve Waste Record</AlertDialogTitle>
                        <AlertDialogDescription>
                            Select the final disposition for this waste record. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="px-6 pb-2 space-y-2">
                        <Label className="text-gray-700 font-medium">Final Disposition *</Label>
                        <Select value={resolveStatus} onValueChange={(v) => setResolveStatus(v as any)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Final Disposition" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DISPOSED">Disposed — thrown away / destroyed</SelectItem>
                                <SelectItem value="RECYCLED">Recycled — sent for recycling</SelectItem>
                                <SelectItem value="REUSED">Reused — used elsewhere</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleResolve}
                            disabled={updateMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                        >
                            {updateMutation.isPending ? 'Saving...' : 'Confirm Resolution'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete dialog */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Waste Record</AlertDialogTitle>
                        <AlertDialogDescription>
                            Delete <strong>{record.wasteNumber}</strong>? The record will be soft-deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleteMutation.isPending}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
