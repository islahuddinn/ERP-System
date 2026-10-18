'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateBom, type CreateBomItemDto } from '@/hooks/useBom'
import { useProducts, type Product } from '@/hooks/useProducts'
import { useRawMaterialsDropdown } from '@/hooks/useRawMaterials'
import { useUOMsDropdown } from '@/hooks/useMasterData'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ArrowLeft, Save, Loader2, Plus, Trash2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

interface ItemRow {
    rawMaterialId: string
    uomId: string
    quantityPerUnit: string
    wastagePercent: string
    notes: string
}

const emptyRow = (): ItemRow => ({ rawMaterialId: '', uomId: '', quantityPerUnit: '', wastagePercent: '', notes: '' })

export default function CreateBomPage() {
    const router = useRouter()
    const createMutation = useCreateBom()

    const [productId, setProductId] = useState('')
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [items, setItems] = useState<ItemRow[]>([emptyRow()])
    const [submitted, setSubmitted] = useState(false)

    // Only ACTIVE products can have a BOM (backend rejects inactive) — filter the
    // dropdown to active products so inactive ones never appear (#14).
    const { data: productsResponse } = useProducts({ limit: 200, isActive: true })
    const products = useMemo<Product[]>(() => {
        if (!productsResponse) return []
        const raw = (productsResponse as any).data ?? productsResponse
        if (Array.isArray(raw)) return raw
        if (Array.isArray((raw as any).data)) return (raw as any).data
        return []
    }, [productsResponse])

    const { data: rawMaterials = [] } = useRawMaterialsDropdown()
    const { data: uoms = [] } = useUOMsDropdown()

    const updateRow = (index: number, patch: Partial<ItemRow>) => {
        setItems((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)))
    }

    const handleRawMaterialChange = (index: number, rawMaterialId: string) => {
        const material = rawMaterials.find((r) => r.id === rawMaterialId)
        // Default the UOM to the material's own unit but keep it overridable (#13 parity).
        updateRow(index, { rawMaterialId, uomId: material?.uom?.id ?? items[index]?.uomId ?? '' })
    }

    const addRow = () => setItems((prev) => [...prev, emptyRow()])
    const removeRow = (index: number) => setItems((prev) => (prev.length === 1 ? [emptyRow()] : prev.filter((_, i) => i !== index)))

    // ── Validation (#11) ──────────────────────────────────────────────────────
    const nameError = !name.trim() ? 'BOM name is required' : ''
    const productError = !productId ? 'Product is required' : ''
    const rowErrors = items.map((row) => {
        // Ignore fully-empty extra rows — only validate rows the user started filling.
        const touched = row.rawMaterialId || row.quantityPerUnit || row.notes
        if (!touched) return ''
        if (!row.rawMaterialId) return 'Select a raw material'
        if (!row.uomId) return 'Select a UOM'
        const qty = parseFloat(row.quantityPerUnit)
        if (Number.isNaN(qty) || qty <= 0) return 'Enter a quantity greater than 0'
        return ''
    })
    const validItems = items.filter(
        (row) => row.rawMaterialId && row.uomId && parseFloat(row.quantityPerUnit) > 0,
    )
    const itemsError =
        validItems.length === 0 ? 'Add at least one raw material with a quantity' : ''
    const duplicateError =
        new Set(validItems.map((r) => r.rawMaterialId)).size !== validItems.length
            ? 'A raw material is listed more than once'
            : ''

    const hasErrors =
        !!nameError || !!productError || !!itemsError || !!duplicateError || rowErrors.some(Boolean)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitted(true)
        if (hasErrors) {
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

        await createMutation.mutateAsync({
            productId,
            name: name.trim(),
            description: description.trim() || undefined,
            items: payloadItems,
        })
        router.push('/dashboard/bom')
    }

    return (
        <ProtectedRoute requiredPermission="bom.create">
            <div className="factory-section">
                <div className="factory-page-container">
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <Link href="/dashboard/bom">
                                <Button variant="outline" size="icon">
                                    <ArrowLeft className="h-4 w-4" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Create Bill of Materials</h1>
                                <p className="text-gray-500 mt-1">New BOMs start in Draft status. Add the raw materials that make up this product.</p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <Card className="bg-white border border-gray-200 shadow-sm">
                                <CardHeader>
                                    <CardTitle>BOM Information</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">BOM Name <span className="text-red-500">*</span></Label>
                                            <Input
                                                id="name"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                placeholder="e.g., Face Wash — Standard Formula"
                                            />
                                            {submitted && nameError && (
                                                <p className="text-sm text-red-500">{nameError}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="productId">Product <span className="text-red-500">*</span></Label>
                                            <Select value={productId} onValueChange={setProductId}>
                                                <SelectTrigger id="productId">
                                                    <SelectValue placeholder="Select finished product" />
                                                </SelectTrigger>
                                                <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                                                    {products.map((p) => (
                                                        <SelectItem key={p.id} value={p.id}>
                                                            {p.name}{p.code ? ` (${p.code})` : ''}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            {submitted && productError && (
                                                <p className="text-sm text-red-500">{productError}</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Description</Label>
                                        <Textarea
                                            id="description"
                                            value={description}
                                            onChange={(e) => setDescription(e.target.value)}
                                            placeholder="Optional notes about this BOM..."
                                            rows={3}
                                        />
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Raw Material Items (#9) */}
                            <Card className="bg-white border border-gray-200 shadow-sm">
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle>Raw Materials <span className="text-red-500">*</span></CardTitle>
                                    <Button type="button" size="sm" variant="outline" onClick={addRow}>
                                        <Plus className="mr-2 h-4 w-4" />Add Row
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {items.map((row, index) => {
                                        const material = rawMaterials.find((r) => r.id === row.rawMaterialId)
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
                                                    {submitted && rowErrors[index] ? (
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
                                    {submitted && itemsError && (
                                        <p className="text-sm text-red-500">{itemsError}</p>
                                    )}
                                    {submitted && duplicateError && (
                                        <p className="text-sm text-red-500">{duplicateError}</p>
                                    )}

                                    <div className="flex justify-end gap-3 pt-2">
                                        <Link href="/dashboard/bom">
                                            <Button type="button" variant="outline">Cancel</Button>
                                        </Link>
                                        <Button
                                            type="submit"
                                            className="bg-green-600 hover:bg-green-700"
                                            disabled={createMutation.isPending}
                                        >
                                            {createMutation.isPending ? (
                                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>
                                            ) : (
                                                <><Save className="mr-2 h-4 w-4" />Create BOM</>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </form>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    )
}
