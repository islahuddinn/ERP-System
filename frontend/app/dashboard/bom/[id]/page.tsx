'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    useBom, useUpdateBom, useUpdateBomStatus, useDeleteBom,
    type BomItem, type CreateBomItemDto, type BomStatus,
} from '@/hooks/useBom'
import { useRawMaterialsDropdown, useRawMaterials } from '@/hooks/useRawMaterials'
import { useUOMsDropdown } from '@/hooks/useMasterData'
import { toast } from 'react-hot-toast'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ArrowLeft, Edit, Save, Plus, Trash2, Loader2, Package, Lock } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ViewHistoryButton } from '@/components/audit/entity-history'

const STATUS_STYLES: Record<BomStatus, { className: string; label: string }> = {
    DRAFT: { className: 'bg-gray-100 text-gray-700 border-gray-200', label: 'Draft' },
    ACTIVE: { className: 'bg-green-100 text-green-700 border-green-200', label: 'Active' },
    INACTIVE: { className: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Inactive' },
}

// Status transitions the backend allows (bom.service.validateStatusTransition):
// DRAFT → ACTIVE, ACTIVE → INACTIVE, INACTIVE → ACTIVE. Used to gate the Status
// dropdown so only valid targets are selectable.
const STATUS_TRANSITIONS: Record<BomStatus, BomStatus[]> = {
    DRAFT: ['ACTIVE'],
    ACTIVE: ['INACTIVE'],
    INACTIVE: ['ACTIVE'],
}
const ALL_STATUSES: BomStatus[] = ['DRAFT', 'ACTIVE', 'INACTIVE']

// One editable raw-material row. Quantity / Wastage are strings so the fields can be
// fully cleared (an empty input) instead of snapping back to 0 (#31). Mirrors the
// Create BOM screen's row shape so edit behaves identically (#41).
interface ItemRow {
    rawMaterialId: string
    uomId: string
    quantityPerUnit: string
    wastagePercent: string
    notes: string
}
const emptyRow = (): ItemRow => ({ rawMaterialId: '', uomId: '', quantityPerUnit: '', wastagePercent: '', notes: '' })

export default function BomDetailPage() {
    const router = useRouter()
    const { id: bomId } = useParams() as { id: string }

    const { data: bom, isLoading } = useBom(bomId)
    const updateMutation = useUpdateBom()
    const statusMutation = useUpdateBomStatus()
    const deleteMutation = useDeleteBom()

    const { data: rawMaterials = [] } = useRawMaterialsDropdown()
    const { data: uoms = [] } = useUOMsDropdown()
    // Full raw-material records carry currentStock, used to show a soft "exceeds
    // available stock" hint on a BOM item's quantity (#30).
    const { data: rawMaterialsFull } = useRawMaterials({ limit: 500 })
    const stockByMaterialId = useMemo(() => {
        const list = (rawMaterialsFull?.data ?? []) as Array<{ id: string; currentStock?: number }>
        const map = new Map<string, number>()
        for (const rm of list) map.set(rm.id, Number(rm.currentStock ?? 0))
        return map
    }, [rawMaterialsFull])

    const [isEditing, setIsEditing] = useState(false)
    const [editName, setEditName] = useState('')
    const [editDescription, setEditDescription] = useState('')
    // Inline, editable copy of the BOM's raw materials — the whole recipe is edited
    // in place and saved together with name/description in one PATCH, exactly like the
    // Create screen (#41).
    const [editItems, setEditItems] = useState<ItemRow[]>([emptyRow()])
    // Tracks whether the user has attempted to save so required-field messages
    // only appear after a save attempt (#11).
    const [editAttempted, setEditAttempted] = useState(false)

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

    // Keep the read-only name/description in sync with the loaded BOM while not editing.
    useEffect(() => {
        if (bom && !isEditing) {
            setEditName(bom.name)
            setEditDescription(bom.description ?? '')
        }
    }, [bom, isEditing])

    // Seed the inline editor from the current BOM and enter edit mode.
    const beginEdit = () => {
        if (!bom) return
        setEditName(bom.name)
        setEditDescription(bom.description ?? '')
        const rows = (bom.items ?? []).map((i) => ({
            rawMaterialId: i.rawMaterialId,
            uomId: i.uomId ?? i.uom?.id ?? '',
            quantityPerUnit: String(i.quantityPerUnit ?? ''),
            wastagePercent: i.wastagePercent ? String(i.wastagePercent) : '',
            notes: i.notes ?? '',
        }))
        setEditItems(rows.length ? rows : [emptyRow()])
        setEditAttempted(false)
        setIsEditing(true)
    }

    const cancelEdit = () => {
        setIsEditing(false)
        setEditAttempted(false)
        if (bom) {
            setEditName(bom.name)
            setEditDescription(bom.description ?? '')
        }
    }

    // ── Inline row helpers (mirror Create) ────────────────────────────────────
    const updateRow = (index: number, patch: Partial<ItemRow>) =>
        setEditItems((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)))

    const handleRawMaterialChange = (index: number, rawMaterialId: string) => {
        const material = rawMaterials.find((r) => r.id === rawMaterialId)
        // Default the UOM to the material's own unit but keep it overridable (#13).
        updateRow(index, { rawMaterialId, uomId: material?.uom?.id ?? editItems[index]?.uomId ?? '' })
    }

    const addRow = () => setEditItems((prev) => [...prev, emptyRow()])
    const removeRow = (index: number) =>
        setEditItems((prev) => (prev.length === 1 ? [emptyRow()] : prev.filter((_, i) => i !== index)))

    // ── Validation (mirrors Create #11) ───────────────────────────────────────
    const rowErrors = editItems.map((row) => {
        const touched = row.rawMaterialId || row.quantityPerUnit || row.notes
        if (!touched) return ''
        if (!row.rawMaterialId) return 'Select a raw material'
        if (!row.uomId) return 'Select a UOM'
        const qty = parseFloat(row.quantityPerUnit)
        if (Number.isNaN(qty) || qty <= 0) return 'Enter a quantity greater than 0'
        return ''
    })
    const validItems = editItems.filter(
        (row) => row.rawMaterialId && row.uomId && parseFloat(row.quantityPerUnit) > 0,
    )
    const itemsError = validItems.length === 0 ? 'Add at least one raw material with a quantity' : ''
    const duplicateError =
        new Set(validItems.map((r) => r.rawMaterialId)).size !== validItems.length
            ? 'A raw material is listed more than once'
            : ''

    const handleSave = async () => {
        setEditAttempted(true)
        if (!editName.trim()) {
            toast.error('BOM name is required')
            return
        }
        if (itemsError || duplicateError || rowErrors.some(Boolean)) {
            toast.error('Please fix the highlighted fields before saving')
            return
        }

        const payloadItems: CreateBomItemDto[] = validItems.map((row) => ({
            rawMaterialId: row.rawMaterialId,
            uomId: row.uomId,
            quantityPerUnit: parseFloat(row.quantityPerUnit),
            wastagePercent: row.wastagePercent === '' ? 0 : parseFloat(row.wastagePercent),
            notes: row.notes.trim() || undefined,
        }))

        await updateMutation.mutateAsync({
            bomId,
            dto: {
                name: editName.trim(),
                // Send explicit null (not undefined) so a cleared Description persists as
                // empty instead of the backend keeping the old value (#29).
                description: editDescription.trim() || null,
                items: payloadItems,
            },
        })
        setIsEditing(false)
        setEditAttempted(false)
        // After a successful update, return the user to the BOM list (#12).
        router.push('/dashboard/bom')
    }

    // Driven by the Status dropdown. Only valid transitions are selectable, but
    // guard here too so a no-op (re-selecting the current status) is ignored.
    const handleStatusChange = async (value: string) => {
        const next = value as BomStatus
        if (!bom || next === bom.status) return
        await statusMutation.mutateAsync({ bomId, dto: { status: next as 'ACTIVE' | 'INACTIVE' } })
    }

    const handleDelete = async () => {
        await deleteMutation.mutateAsync(bomId)
        router.push('/dashboard/bom')
    }

    if (isLoading) {
        return (
            <ProtectedRoute requiredPermission="bom.read">
                <div className="flex items-center justify-center h-screen">
                    <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                </div>
            </ProtectedRoute>
        )
    }

    if (!bom) {
        return (
            <ProtectedRoute requiredPermission="bom.read">
                <div className="factory-section">
                    <div className="factory-page-container text-center py-12">
                        <p className="text-gray-600">BOM not found</p>
                        <Link href="/dashboard/bom"><Button className="mt-4">Back to BOMs</Button></Link>
                    </div>
                </div>
            </ProtectedRoute>
        )
    }

    const canEdit = bom.status === 'DRAFT'
    const canDelete = bom.status !== 'ACTIVE'

    return (
        <ProtectedRoute requiredPermission="bom.read">
            <div className="factory-section">
                <div className="factory-page-container">
                    <div className="space-y-6">

                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <Link href="/dashboard/bom">
                                    <Button variant="outline" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
                                </Link>
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">{bom.name}</h1>
                                    <p className="text-gray-500 mt-1">{bom.bomNumber}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <ViewHistoryButton entityName="BOM" entityId={bomId} size="default" />
                                {canEdit && !isEditing && (
                                    <Button variant="outline" onClick={beginEdit}>
                                        <Edit className="mr-2 h-4 w-4" />Edit
                                    </Button>
                                )}
                                {isEditing && (
                                    <>
                                        <Button variant="outline" onClick={cancelEdit}>Cancel</Button>
                                        <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700" disabled={updateMutation.isPending}>
                                            {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                            Save
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Non-DRAFT lock notice — the backend only permits editing
                            (name / description / materials) while a BOM is DRAFT, and it
                            never allows transitioning back to DRAFT. Surface this clearly
                            instead of silently hiding the edit controls (#41). */}
                        {!canEdit && (
                            <div className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                                <Lock className="h-4 w-4 mt-0.5 shrink-0" />
                                <p>
                                    This BOM is <strong>{STATUS_STYLES[bom.status]?.label ?? bom.status}</strong>. Only
                                    <strong> DRAFT</strong> BOMs can be edited, so its name, description, and raw
                                    materials are locked. A BOM cannot be returned to DRAFT — to change the recipe,
                                    create a new BOM for this product.
                                </p>
                            </div>
                        )}

                        {/* BOM Info */}
                        <Card className="bg-white border border-gray-200 shadow-sm">
                            <CardHeader><CardTitle>BOM Information</CardTitle></CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <Label>Name {isEditing && <span className="text-red-500">*</span>}</Label>
                                        {isEditing ? (
                                            <>
                                                <Input className="mt-1" value={editName} onChange={(e) => setEditName(e.target.value)} />
                                                {editAttempted && !editName.trim() && (
                                                    <p className="text-sm text-red-500 mt-1">BOM name is required</p>
                                                )}
                                            </>
                                        ) : (
                                            <p className="text-gray-900 font-medium mt-1">{bom.name}</p>
                                        )}
                                    </div>
                                    <div>
                                        <Label>Product</Label>
                                        <p className="text-gray-900 font-medium mt-1">{bom.product?.name ?? '—'}</p>
                                        <p className="text-sm text-gray-500">{bom.product?.code}</p>
                                    </div>
                                    <div>
                                        <Label>Status</Label>
                                        <div className="mt-1 flex items-center gap-3 flex-wrap">
                                            {/* Status dropdown — only backend-allowed transitions are
                                                selectable; the current and invalid targets are disabled (#15). */}
                                            <Select value={bom.status} onValueChange={handleStatusChange} disabled={statusMutation.isPending || isEditing}>
                                                <SelectTrigger className="w-44">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {ALL_STATUSES.map((s) => (
                                                        <SelectItem
                                                            key={s}
                                                            value={s}
                                                            disabled={s !== bom.status && !STATUS_TRANSITIONS[bom.status].includes(s)}
                                                        >
                                                            {STATUS_STYLES[s]?.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {statusMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
                                            {canDelete && !isEditing && (
                                                <Button size="sm" variant="ghost" className="h-8 text-xs text-red-600 hover:text-red-700" onClick={() => setDeleteDialogOpen(true)}>
                                                    Delete BOM
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Created</Label>
                                        <p className="text-gray-900 mt-1">{format(new Date(bom.createdAt), 'PPP')}</p>
                                    </div>
                                </div>
                                {(bom.description || isEditing) && (
                                    <div>
                                        <Label>Description</Label>
                                        {isEditing ? (
                                            <Textarea className="mt-1" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
                                        ) : (
                                            <p className="text-gray-700 mt-1">{bom.description}</p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Raw Material Items */}
                        <Card className="bg-white border border-gray-200 shadow-sm">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>
                                    Raw Materials{isEditing && <span className="text-red-500"> *</span>}
                                    {!isEditing && ` (${bom.items?.length ?? 0})`}
                                </CardTitle>
                                {isEditing && (
                                    <Button type="button" size="sm" variant="outline" onClick={addRow}>
                                        <Plus className="mr-2 h-4 w-4" />Add Row
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent>
                                {isEditing ? (
                                    /* Inline editable rows — identical layout to the Create screen (#41). */
                                    <div className="space-y-4">
                                        {editItems.map((row, index) => {
                                            const material = rawMaterials.find((r) => r.id === row.rawMaterialId)
                                            const stock = row.rawMaterialId ? stockByMaterialId.get(row.rawMaterialId) : undefined
                                            const overStock =
                                                stock !== undefined && row.quantityPerUnit !== '' && parseFloat(row.quantityPerUnit) > stock
                                            return (
                                                <div key={index} className="rounded-lg border border-gray-200 p-4 space-y-4">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <Label>Raw Material <span className="text-red-500">*</span></Label>
                                                            <Select
                                                                value={row.rawMaterialId}
                                                                onValueChange={(v) => handleRawMaterialChange(index, v)}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select raw material" />
                                                                </SelectTrigger>
                                                                <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                                                                    {rawMaterials.map((r) => (
                                                                        <SelectItem key={r.id} value={r.id}>
                                                                            {r.name} ({r.code})
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>UOM <span className="text-red-500">*</span></Label>
                                                            <Select
                                                                value={row.uomId}
                                                                onValueChange={(v) => updateRow(index, { uomId: v })}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select UOM" />
                                                                </SelectTrigger>
                                                                <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                                                                    {uoms.map((u) => (
                                                                        <SelectItem key={u.id} value={u.id}>
                                                                            {u.name} ({u.symbol})
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            {material?.uom && (
                                                                <p className="text-xs text-gray-500">
                                                                    Default: {material.uom.name} ({material.uom.symbol})
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                        <div className="space-y-2">
                                                            <Label>Qty per finished unit <span className="text-red-500">*</span></Label>
                                                            <Input
                                                                type="number"
                                                                min="0.0001"
                                                                step="0.0001"
                                                                value={row.quantityPerUnit}
                                                                onChange={(e) => updateRow(index, { quantityPerUnit: e.target.value })}
                                                            />
                                                            {overStock && (
                                                                <p className="text-xs text-amber-600">
                                                                    Note: exceeds current stock ({stock} {material?.uom?.symbol ?? ''}).
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Wastage % (0–100)</Label>
                                                            <Input
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                step="0.01"
                                                                value={row.wastagePercent}
                                                                onChange={(e) => updateRow(index, { wastagePercent: e.target.value })}
                                                            />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <Label>Notes</Label>
                                                            <Input
                                                                value={row.notes}
                                                                onChange={(e) => updateRow(index, { notes: e.target.value })}
                                                                placeholder="Optional"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        {editAttempted && rowErrors[index] ? (
                                                            <p className="text-sm text-red-500">{rowErrors[index]}</p>
                                                        ) : <span />}
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => removeRow(index)}
                                                            className="text-red-600 hover:text-red-700"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />Remove
                                                        </Button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        {editAttempted && itemsError && (
                                            <p className="text-sm text-red-500">{itemsError}</p>
                                        )}
                                        {editAttempted && duplicateError && (
                                            <p className="text-sm text-red-500">{duplicateError}</p>
                                        )}
                                    </div>
                                ) : bom.items && bom.items.length > 0 ? (
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-gray-50">
                                                <TableHead className="font-semibold text-gray-700">Raw Material</TableHead>
                                                <TableHead className="font-semibold text-gray-700">Code</TableHead>
                                                <TableHead className="font-semibold text-gray-700">Qty / Unit</TableHead>
                                                <TableHead className="font-semibold text-gray-700">UOM</TableHead>
                                                <TableHead className="font-semibold text-gray-700">Wastage %</TableHead>
                                                <TableHead className="font-semibold text-gray-700">Notes</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {bom.items.map((item: BomItem) => (
                                                <TableRow key={item.id} className="hover:bg-gray-50">
                                                    <TableCell className="font-medium text-gray-900">{item.rawMaterial?.name ?? '—'}</TableCell>
                                                    <TableCell className="text-gray-600 font-mono">{item.rawMaterial?.code ?? '—'}</TableCell>
                                                    <TableCell className="text-gray-900">{item.quantityPerUnit}</TableCell>
                                                    <TableCell className="text-gray-600">{item.uom?.symbol ?? item.rawMaterial?.uom?.symbol ?? '—'}</TableCell>
                                                    <TableCell className="text-gray-600">{item.wastagePercent > 0 ? `${item.wastagePercent}%` : '—'}</TableCell>
                                                    <TableCell className="text-gray-600">{item.notes ?? '—'}</TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                ) : (
                                    <div className="text-center py-12">
                                        <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                        <p className="text-gray-600 font-medium">No raw materials added yet</p>
                                        {canEdit && (
                                            <p className="text-sm text-gray-500 mt-2">Click "Edit" to define the ingredients for this BOM</p>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* Delete Confirmation */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete BOM</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>{bom.name}</strong>? This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </ProtectedRoute>
    )
}
