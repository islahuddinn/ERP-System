'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Trash2, ArrowLeft, Loader2, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useUsersDropdown } from '@/hooks/useUsers'
import {
  usePurchasesDropdown,
  usePurchase,
  useCreatePurchaseReturn,
  useUpdatePurchaseReturn,
  useGetPurchaseReturn,
  type CreatePurchaseReturnDto,
} from '@/hooks/usePurchases'
import { useRawMaterialBatches } from '@/hooks/useRawMaterialBatches'
import { useGrns, useGrn } from '@/hooks/useMaterialReceiving'
import { formatCurrency, getActiveCurrency } from '@/lib/currency'

// Sub-component renders one return item row; calls its own batch hook per rawMaterialId
interface ReturnItemRowProps {
  rawMaterialId: string
  rawMaterialName: string
  uomSymbol?: string
  batchId: string
  quantity: number
  unitPrice: number
  reason: string
  onBatchChange: (batchId: string, availableQty: number, unitCost: number) => void
  onQuantityChange: (qty: number) => void
  onUnitPriceChange: (p: number) => void
  onReasonChange: (r: string) => void
  onRemove: () => void
  maxQuantity: number
  showErrors: boolean
}

function ReturnItemRow({
  rawMaterialId,
  rawMaterialName,
  uomSymbol,
  batchId,
  quantity,
  unitPrice,
  reason,
  onBatchChange,
  onQuantityChange,
  onUnitPriceChange,
  onReasonChange,
  onRemove,
  maxQuantity,
  showErrors,
}: ReturnItemRowProps) {
  const { data: batchesResponse } = useRawMaterialBatches({ rawMaterialId })
  const batches = (batchesResponse?.data ?? batchesResponse ?? []) as any[]
  const availableBatches = batches.filter((b: any) => b.availableQuantity > 0)

  // Required-field validation surfaced only after a submit attempt (#34/#35).
  const batchError: string | null = showErrors && !batchId ? 'Batch is required' : null

  // Inline validation for the return quantity (#45/#34): required, > 0, and not over the
  // available quantity on the selected batch.
  const quantityError: string | null =
    quantity > 0 && maxQuantity > 0 && quantity > maxQuantity
      ? `Cannot exceed available quantity (${Number(maxQuantity.toFixed(3))})`
      : showErrors && !(quantity > 0)
        ? 'Quantity is required'
        : null

  return (
    <TableRow className="border-gray-200 hover:bg-gray-50 align-middle">
      <TableCell className="text-gray-900 font-medium">{rawMaterialName}</TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Select
            value={batchId}
            onValueChange={val => {
              const b = availableBatches.find((b: any) => b.id === val)
              onBatchChange(val, b?.availableQuantity ?? 0, Number(b?.unitCost) || 0)
            }}
          >
            <SelectTrigger
              className={cn(
                'bg-white border-gray-300 text-gray-900 w-48',
                batchError && 'border-red-500 focus:ring-red-500',
              )}
              aria-invalid={!!batchError}
            >
              <SelectValue placeholder="Select batch" />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
              {availableBatches.length === 0 ? (
                <SelectItem value="_none" disabled>No available batches</SelectItem>
              ) : availableBatches.map((b: any) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.batchNumber} ({b.availableQuantity} {uomSymbol ?? ''})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {batchError && (
            <span className="text-xs text-red-600 whitespace-nowrap">{batchError}</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Input
            type="number"
            min={0.01}
            max={maxQuantity}
            step="0.01"
            value={quantity || ''}
            onChange={e => onQuantityChange(parseFloat(e.target.value) || 0)}
            className={cn(
              'w-28 bg-white border-gray-300 text-gray-900',
              quantityError && 'border-red-500 focus-visible:ring-red-500',
            )}
            aria-invalid={!!quantityError}
          />
          {maxQuantity > 0 && (
            <span className="text-xs text-gray-500 whitespace-nowrap">max: {Number(maxQuantity.toFixed(3))}</span>
          )}
          {quantityError && (
            <span className="text-xs text-red-600 whitespace-nowrap">{quantityError}</span>
          )}
        </div>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <Input
            type="number"
            min={0}
            step="0.01"
            value={unitPrice || ''}
            onChange={e => onUnitPriceChange(parseFloat(e.target.value) || 0)}
            placeholder="0.00"
            className="w-28 bg-white border-gray-300 text-gray-900"
          />
          <span className="text-xs text-gray-500 whitespace-nowrap">
            Line: {formatCurrency((Number(quantity) || 0) * (Number(unitPrice) || 0))}
          </span>
        </div>
      </TableCell>
      <TableCell>
        <Input
          value={reason}
          onChange={e => onReasonChange(e.target.value)}
          placeholder="e.g. Damaged"
          className="w-36 bg-white border-gray-300 text-gray-900"
        />
      </TableCell>
      <TableCell>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="text-red-400 hover:text-red-300"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}

interface ReturnItem {
  // Existing item id (edit mode) — sent back so the backend UPDATES the item in
  // place and PRESERVES its recorded unitPrice, instead of delete+recreate which
  // re-derives the price from the batch cost (0 if that batch cost is null).
  id?: string
  rawMaterialId: string
  rawMaterialName: string
  uomSymbol?: string
  // PO line item this material came from — sent as purchaseItemId for traceability.
  purchaseItemId?: string
  batchId: string
  quantity: number
  unitPrice: number
  reason: string
  maxQuantity: number
}

function PurchaseReturnForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const editId = searchParams.get('id') || ''
  const isEdit = !!editId
  const [selectedPoId, setSelectedPoId] = useState('')
  // GRN this return is against (optional traceability, #37) and the return date (#37).
  const [selectedGrnId, setSelectedGrnId] = useState('')
  // Return date starts EMPTY (the user must pick it — it's a required field validated on
  // submit). In EDIT mode it's filled from the existing return by the prefill effect below.
  const [returnDate, setReturnDate] = useState('')
  const [reason, setReason] = useState('')
  const [remarks, setRemarks] = useState('')
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([])
  // Assigned approvers — the return enters its approve/reject flow for these users (#7).
  const [approverIds, setApproverIds] = useState<string[]>([])
  // Surface required-field errors only after the user attempts to submit (#34/#35).
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const prefilled = useRef(false)

  const { data: poDropdown = [] } = usePurchasesDropdown()
  const { data: selectedPo } = usePurchase(selectedPoId)
  const { data: users = [] } = useUsersDropdown()
  // GRNs for the GRN dropdown; scoped to the selected PO (a GRN belongs to one PO).
  // limit is 100 (PaginationDto's @Max) — 200 fails validation (400) and silently
  // emptied the list, which is why the dropdown showed "No GRNs for this order" (#34).
  const { data: grnsResponse } = useGrns({ limit: 100 })
  const allGrns = (grnsResponse?.data ?? []) as any[]
  const poGrns = selectedPoId ? allGrns.filter(g => g.purchaseOrderId === selectedPoId) : []
  // Full detail of the chosen GRN — used to resolve each item's grnItemId (the GRN
  // item whose batches include the selected batch) for the create/update payload.
  const { data: selectedGrnDetail } = useGrn(selectedGrnId)
  const createReturn = useCreatePurchaseReturn()
  const updateReturn = useUpdatePurchaseReturn()
  const { data: existingReturn } = useGetPurchaseReturn(editId)

  const toggleApprover = (userId: string) => {
    setApproverIds(prev => (prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]))
  }

  // In edit mode, prefill the form once the existing DRAFT return loads. Every field
  // shown on the create screen is restored here so edit mirrors create (#38).
  useEffect(() => {
    const ex: any = existingReturn
    if (!ex || prefilled.current) return
    prefilled.current = true
    setSelectedPoId(ex.purchaseOrder?.id ?? ex.purchaseOrderId ?? '')
    setSelectedGrnId(ex.grn?.id ?? ex.grnId ?? '')
    setReturnDate((ex.returnDate ?? '').slice(0, 10))
    setReason(ex.reason ?? '')
    setRemarks(ex.remarks ?? '')
    setApproverIds((ex.approvals ?? []).map((a: any) => a.approverId).filter(Boolean))
    setReturnItems(
      (ex.items ?? []).map((it: any) => ({
        id: it.id,
        rawMaterialId: it.rawMaterial?.id ?? it.rawMaterialId ?? '',
        rawMaterialName: it.rawMaterial?.name ?? '—',
        uomSymbol: it.rawMaterial?.uom?.symbol,
        purchaseItemId: it.purchaseItem?.id ?? it.purchaseItemId ?? undefined,
        batchId: it.batch?.id ?? it.batchId ?? '',
        quantity: Number(it.quantity) || 0,
        unitPrice: Number(it.unitPrice) || 0,
        reason: it.reason ?? '',
        maxQuantity:
          (Number(it.quantity) || 0) + (Number(it.batch?.availableQuantity) || 0) || 999999,
      })),
    )
  }, [existingReturn])

  const handlePoSelect = (poId: string) => {
    setSelectedPoId(poId)
    // A GRN belongs to one PO — clear the GRN and items when the PO changes.
    setSelectedGrnId('')
    setReturnItems([])
  }

  const handleAddItem = (poItem: any) => {
    const alreadyAdded = returnItems.some(r => r.rawMaterialId === poItem.rawMaterial?.id)
    if (alreadyAdded) {
      toast.error('This material is already added')
      return
    }
    setReturnItems(prev => [
      ...prev,
      {
        rawMaterialId: poItem.rawMaterial?.id ?? '',
        rawMaterialName: poItem.rawMaterial?.name ?? '—',
        uomSymbol: poItem.rawMaterial?.uom?.symbol,
        purchaseItemId: poItem.id,
        batchId: '',
        quantity: 0,
        unitPrice: 0,
        reason: '',
        maxQuantity: 0,
      },
    ])
  }

  const updateItem = (index: number, patch: Partial<ReturnItem>) => {
    setReturnItems(prev => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  const removeItem = (index: number) => {
    setReturnItems(prev => prev.filter((_, i) => i !== index))
  }

  // Resolve the GRN item a batch was received under, for the payload's grnItemId
  // (traceability). Falls back to undefined when no GRN is chosen or no match.
  const grnItemIdFor = (rawMaterialId: string, batchId: string): string | undefined => {
    const grn: any = selectedGrnDetail
    if (!grn || !batchId) return undefined
    const gi = (grn.items ?? []).find(
      (it: any) =>
        (it.rawMaterialId ?? it.rawMaterial?.id) === rawMaterialId &&
        (it.rawMaterialBatches ?? []).some((b: any) => b.id === batchId),
    )
    return gi?.id
  }

  // Required-field checks (#34/#35/#37): PO, return date, reason, ≥1 item, each item has a batch + quantity.
  const poError = !selectedPoId
  const returnDateError = !returnDate
  const reasonError = reason.trim().length === 0
  const itemsError = returnItems.length === 0
  const itemFieldsError = returnItems.some(r => !r.batchId || !(r.quantity > 0))
  const canSubmit = !poError && !returnDateError && !reasonError && !itemsError && !itemFieldsError

  const handleSubmit = async () => {
    if (!canSubmit) {
      setSubmitAttempted(true)
      toast.error('Please fill all required fields before saving')
      return
    }

    const dto: CreatePurchaseReturnDto = {
      purchaseOrderId: selectedPoId,
      grnId: selectedGrnId || undefined,
      returnDate: returnDate || undefined,
      reason,
      remarks: remarks || undefined,
      approverIds: approverIds.length > 0 ? approverIds : undefined,
      items: returnItems.map(r => ({
        // Send the id for existing items (edit) so the backend updates in place and
        // keeps the recorded unitPrice; new items have no id and are created.
        ...(r.id ? { id: r.id } : {}),
        rawMaterialId: r.rawMaterialId,
        batchId: r.batchId,
        grnItemId: grnItemIdFor(r.rawMaterialId, r.batchId),
        purchaseItemId: r.purchaseItemId,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        reason: r.reason || undefined,
      })),
    }

    try {
      if (isEdit) {
        await updateReturn.mutateAsync({ returnId: editId, data: dto })
        toast.success('Purchase return updated')
      } else {
        await createReturn.mutateAsync(dto)
        toast.success('Purchase return created')
      }
      router.push('/dashboard/purchases/returns/list')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to save purchase return')
    }
  }

  const receivedPos = poDropdown.filter(po => po.status === 'RECEIVED' || po.status === 'PARTIAL')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{isEdit ? 'Edit Purchase Return' : 'Create Purchase Return'}</h1>
          <p className="text-gray-500">Return raw material batches to supplier</p>
        </div>
      </div>

      {/* Return Header */}
      <Card className="bg-white border-gray-200">
        <CardHeader>
          <CardTitle className="text-gray-900">Return Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-gray-700">Purchase Order *</Label>
              <Select value={selectedPoId} onValueChange={handlePoSelect}>
                <SelectTrigger
                  className={cn(
                    'bg-white border-gray-300 text-gray-900',
                    submitAttempted && poError && 'border-red-500 focus:ring-red-500',
                  )}
                  aria-invalid={submitAttempted && poError}
                >
                  <SelectValue placeholder="Select a received purchase order" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                  {receivedPos.length === 0 ? (
                    <SelectItem value="_none" disabled>No received orders found</SelectItem>
                  ) : receivedPos.map(po => (
                    <SelectItem key={po.id} value={po.id}>
                      {po.orderNumber} — {po.supplier?.name} ({po.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {submitAttempted && poError && (
                <span className="text-xs text-red-600">Purchase order is required</span>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">
                GRN <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <Select
                value={selectedGrnId || '_none'}
                onValueChange={val => setSelectedGrnId(val === '_none' ? '' : val)}
                disabled={!selectedPoId}
              >
                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                  <SelectValue placeholder={selectedPoId ? 'Select a GRN' : 'Select a purchase order first'} />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                  <SelectItem value="_none">— None —</SelectItem>
                  {poGrns.length === 0 ? (
                    <SelectItem value="_empty" disabled>No GRNs for this order</SelectItem>
                  ) : poGrns.map((g: any) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.receivingNumber}
                      {g.receivedDate ? ` — ${new Date(g.receivedDate).toLocaleDateString()}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Return Date *</Label>
              <Input
                type="date"
                value={returnDate}
                onChange={e => setReturnDate(e.target.value)}
                className={cn(
                  'bg-white border-gray-300 text-gray-900',
                  submitAttempted && returnDateError && 'border-red-500 focus-visible:ring-red-500',
                )}
                aria-invalid={submitAttempted && returnDateError}
              />
              {submitAttempted && returnDateError && (
                <span className="text-xs text-red-600">Return date is required</span>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-gray-700">Return Reason *</Label>
              <Input
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Defective material, Wrong specification"
                className={cn(
                  'bg-white border-gray-300 text-gray-900',
                  submitAttempted && reasonError && 'border-red-500 focus-visible:ring-red-500',
                )}
                aria-invalid={submitAttempted && reasonError}
              />
              {submitAttempted && reasonError && (
                <span className="text-xs text-red-600">Return reason is required</span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-gray-700">Remarks (optional)</Label>
            <Textarea
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="Additional notes…"
              rows={2}
              className="bg-white border-gray-300 text-gray-900"
            />
          </div>

          {/* Approvers (#7): assign users who must approve/reject this return. Once
              all approve, the return is auto-approved; a rejection keeps it DRAFT. */}
          {(users as any[]).length > 0 && (
            <div className="space-y-2">
              <Label className="text-gray-700">
                Approvers <span className="text-gray-400 font-normal">(optional)</span>
              </Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {approverIds.map(id => {
                  const user = (users as any[]).find(u => u.id === id)
                  return user ? (
                    <Badge key={id} variant="secondary" className="flex items-center gap-1">
                      {user.name}
                      <button type="button" onClick={() => toggleApprover(id)} className="ml-1 hover:text-red-600">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null
                })}
              </div>
              <Select onValueChange={toggleApprover} value="">
                <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                  <SelectValue placeholder="Add approver…" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                  {(users as any[])
                    .filter(u => !approverIds.includes(u.id))
                    .map(u => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name} <span className="text-gray-400 text-xs">({u.role})</span>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PO Items — pick what to return */}
      {selectedPo && (
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">
              Items from Order {selectedPo.orderNumber}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow className="border-gray-200">
                  <TableHead className="text-gray-500">Raw Material</TableHead>
                  <TableHead className="text-gray-500">Ordered</TableHead>
                  <TableHead className="text-gray-500">Received</TableHead>
                  <TableHead className="text-gray-500">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedPo.items?.map((item: any) => (
                  <TableRow key={item.id} className="border-gray-200 hover:bg-gray-50">
                    <TableCell className="text-gray-900">{item.rawMaterial?.name ?? '—'}</TableCell>
                    <TableCell className="text-gray-700">
                      {item.quantity} {item.rawMaterial?.uom?.symbol ?? ''}
                    </TableCell>
                    <TableCell className="text-gray-700">
                      {item.receivedQty ?? 0} {item.rawMaterial?.uom?.symbol ?? ''}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddItem(item)}
                        disabled={returnItems.some(r => r.rawMaterialId === item.rawMaterial?.id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {returnItems.some(r => r.rawMaterialId === item.rawMaterial?.id) ? 'Added' : 'Add'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Return Items */}
      {returnItems.length > 0 && (
        <Card className="bg-white border-gray-200">
          <CardHeader>
            <CardTitle className="text-gray-900">Return Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-gray-200 overflow-hidden">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow className="border-gray-200">
                  <TableHead className="text-gray-500 w-[24%]">Raw Material</TableHead>
                  <TableHead className="text-gray-500 w-52">Batch</TableHead>
                  <TableHead className="text-gray-500 w-36">Quantity</TableHead>
                  <TableHead className="text-gray-500 w-36">Unit Price ({getActiveCurrency().symbol})</TableHead>
                  <TableHead className="text-gray-500 w-40">Reason</TableHead>
                  <TableHead className="text-gray-500 w-20">Remove</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returnItems.map((item, idx) => (
                  <ReturnItemRow
                    key={`${item.rawMaterialId}-${idx}`}
                    rawMaterialId={item.rawMaterialId}
                    rawMaterialName={item.rawMaterialName}
                    uomSymbol={item.uomSymbol}
                    batchId={item.batchId}
                    quantity={item.quantity}
                    unitPrice={item.unitPrice}
                    reason={item.reason}
                    maxQuantity={item.maxQuantity}
                    onBatchChange={(batchId, availableQty, unitCost) =>
                      // Default the price to the batch's unit cost when a batch is
                      // picked (user can override); keep an already-entered price.
                      updateItem(idx, {
                        batchId,
                        maxQuantity: availableQty,
                        unitPrice: item.unitPrice > 0 ? item.unitPrice : unitCost,
                      })
                    }
                    onQuantityChange={qty => {
                      const capped = Math.min(qty, item.maxQuantity)
                      if (qty > item.maxQuantity) toast.error(`Max available: ${item.maxQuantity}`)
                      updateItem(idx, { quantity: capped })
                    }}
                    onUnitPriceChange={p => updateItem(idx, { unitPrice: p })}
                    onReasonChange={r => updateItem(idx, { reason: r })}
                    onRemove={() => removeItem(idx)}
                    showErrors={submitAttempted}
                  />
                ))}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {submitAttempted && itemsError && (
        <p className="text-right text-sm text-red-600">
          Add at least one item to return (select a batch and quantity for each).
        </p>
      )}
      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()} className="border-gray-300 text-gray-700 hover:bg-gray-50">
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={createReturn.isPending || updateReturn.isPending}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          {(createReturn.isPending || updateReturn.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isEdit ? 'Update Return' : 'Create Return'}
        </Button>
      </div>
    </div>
  )
}

export default function PurchaseReturnsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Loading…</div>}>
      <PurchaseReturnForm />
    </Suspense>
  )
}
