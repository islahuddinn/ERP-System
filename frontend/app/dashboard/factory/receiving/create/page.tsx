'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import {
  useCreateGrn,
  type CreateGrnDto,
  type GrnReceivingType,
} from '@/hooks/useMaterialReceiving'
import { useRawMaterialsDropdown } from '@/hooks/useRawMaterials'
import { useSuppliersDropdown } from '@/hooks/useSuppliers'
import { apiClient } from '@/lib/api-client'
import { getApiErrorMessage } from '@/lib/api-error'
import { extractArrayFromResponse, extractPaginatedDataFromResponse, unwrapResponse } from '@/lib/response-utils'
import { ArrowLeft, Plus, Trash2, Loader2, Package, ChevronDown, ChevronUp } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BatchFormData {
  siteId: string
  // Clearable-number field: stored as a string ('' = empty), converted on submit.
  quantity: string
  manufacturingDate?: string
  expiryDate?: string
  unitCost?: string
  notes?: string
}

interface ItemFormData {
  rawMaterialId: string
  uomId: string
  // Clearable-number fields: stored as strings ('' = empty), converted on submit.
  expectedQuantity: string
  receivedQuantity: string
  specifications?: string
  receivingNotes?: string
  batches: BatchFormData[]
}

interface GrnFormData {
  receivingType: GrnReceivingType
  purchaseOrderId: string
  supplierId: string
  receivedDate: string
  vehicleDetails?: string
  deliveryNoteNumber?: string
  notes?: string
  items: ItemFormData[]
}

type PoLineForGrn = {
  rawMaterial?: { id: string; name: string; code: string }
  rawMaterialId?: string
  quantity?: number
  receivedQty?: number
}

/** Remaining PO quantity (ordered − already received) — used for Expected + Received defaults. */
function getPoRemainingQuantity(poLine: PoLineForGrn): string {
  const ordered = Number(poLine.quantity) || 0
  const received = Number(poLine.receivedQty) || 0
  const remaining = Math.max(ordered - received, 0)
  return String(remaining > 0 ? remaining : ordered)
}

function resolveExpectedQuantity(
  rawMaterialId: string,
  poLineByRawMaterialId: Map<string, PoLineForGrn>,
  fallback: string,
): number {
  const poLine = poLineByRawMaterialId.get(rawMaterialId)
  if (poLine) return Number(getPoRemainingQuantity(poLine))
  const parsed = Number(fallback)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateGrnPage() {
  const router = useRouter()
  const createMutation = useCreateGrn()
  const { data: suppliers = [] } = useSuppliersDropdown()
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set())
  // Inline required-validation message for the Items section (shown when the user tries
  // to submit with no items / incomplete batches — QA #4).
  const [itemsError, setItemsError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    watch,
    getValues,
    setValue,
    formState: { errors },
  } = useForm<GrnFormData>({
    defaultValues: {
      // Start empty so the Select shows its "Select type" placeholder instead of a
      // pre-picked value (aligns with the Add Site / payment dropdowns). The Controller's
      // required rule validates it on submit.
      receivingType: '' as GrnReceivingType,
      purchaseOrderId: '',
      supplierId: '',
      receivedDate: new Date().toISOString().split('T')[0],
      items: [],
    },
  })

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
    replace: replaceItems,
  } = useFieldArray({
    control,
    name: 'items',
  })

  const lastAutoLoadedPoIdRef = useRef<string | null>(null)

  // Fetch purchase orders for dropdown — only CONFIRMED and PARTIAL are receivable
  const { data: purchasesData } = useQuery({
    queryKey: ['purchases-for-grn'],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/purchase-orders', {
        params: { limit: 100 },
      })
      return extractPaginatedDataFromResponse<{
        id: string
        orderNumber: string
        status: string
        supplier?: { name: string }
      }>(response).data
    },
  })
  const purchaseOrders = (purchasesData ?? []).filter(
    po => po.status === 'CONFIRMED' || po.status === 'PARTIAL'
  )

  // Fetch sites for batch destination
  const { data: sitesData } = useQuery({
    queryKey: ['sites-dropdown'],
    queryFn: async () => {
      const { data: response } = await apiClient.get('/sites/dropdown')
      return extractArrayFromResponse<{ id: string; name: string; code?: string }>(response)
    },
  })
  const sites = sitesData ?? []

  // Auto-populate supplier from selected PO
  const selectedPoId = watch('purchaseOrderId')
  const selectedPo = purchaseOrders.find(po => po.id === selectedPoId)

  // Fetch the selected PO's detail so we know its line items (for filtering raw
  // materials to ONLY the PO's items — QA #65 — and auto-filling received qty — QA #64).
  const { data: selectedPoDetail } = useQuery({
    queryKey: ['purchase-order-for-grn', selectedPoId],
    enabled: !!selectedPoId,
    queryFn: async () => {
      const { data: response } = await apiClient.get(`/purchase-orders/${selectedPoId}`)
      return unwrapResponse(response) as {
        id: string
        items?: Array<{
          rawMaterial?: { id: string; name: string; code: string }
          rawMaterialId?: string
          quantity?: number
          receivedQty?: number
        }>
      }
    },
  })

  // Line items of the selected PO, keyed by rawMaterialId (memoized — a new Map each render caused an infinite setValue loop).
  const poItems = useMemo(
    () => selectedPoDetail?.items ?? [],
    [selectedPoDetail],
  )

  const poLineByRawMaterialId = useMemo(() => {
    const map = new Map<string, PoLineForGrn>()
    for (const line of poItems) {
      const rawMaterialId = line.rawMaterial?.id ?? line.rawMaterialId
      if (rawMaterialId) map.set(rawMaterialId, line)
    }
    return map
  }, [poItems])

  // Fetch raw materials with their default UOM
  const { data: rawMaterials = [] } = useRawMaterialsDropdown()

  const buildItemsFromPurchaseOrder = useCallback((): ItemFormData[] => {
    const items: ItemFormData[] = []
    for (const poLine of poItems) {
      const rawMaterialId = poLine.rawMaterial?.id ?? poLine.rawMaterialId ?? ''
      if (!rawMaterialId) continue

      const rawMaterial = rawMaterials.find((rm) => rm.id === rawMaterialId)
      const qty = getPoRemainingQuantity(poLine)
      if (Number(qty) <= 0) continue

      items.push({
        rawMaterialId,
        uomId: rawMaterial?.uom?.id ?? '',
        expectedQuantity: qty,
        receivedQuantity: qty,
        specifications: '',
        receivingNotes: '',
        batches: [{ siteId: '', quantity: qty }],
      })
    }
    return items
  }, [poItems, rawMaterials])

  // When a PO is selected, pre-fill all its line items so Expected is never blank.
  useEffect(() => {
    if (!selectedPoId || poItems.length === 0 || rawMaterials.length === 0) {
      if (!selectedPoId) lastAutoLoadedPoIdRef.current = null
      return
    }
    if (lastAutoLoadedPoIdRef.current === selectedPoId) return

    const builtItems = buildItemsFromPurchaseOrder()
    if (builtItems.length === 0) return

    lastAutoLoadedPoIdRef.current = selectedPoId
    replaceItems(builtItems)
    setExpandedItems(new Set(builtItems.map((_, index) => index)))
    setItemsError(null)
  }, [selectedPoId, poItems, rawMaterials, buildItemsFromPurchaseOrder, replaceItems])

  // Keep Expected in sync when PO lines or item selections change (guard against redundant setValue).
  useEffect(() => {
    if (!selectedPoId || poLineByRawMaterialId.size === 0) return

    itemFields.forEach((_, itemIndex) => {
      const rawMaterialId = getValues(`items.${itemIndex}.rawMaterialId`)
      if (!rawMaterialId) return
      const poLine = poLineByRawMaterialId.get(rawMaterialId)
      if (!poLine) return
      const qty = getPoRemainingQuantity(poLine)
      const current = getValues(`items.${itemIndex}.expectedQuantity`)
      if (current !== qty) {
        setValue(`items.${itemIndex}.expectedQuantity`, qty, { shouldValidate: false })
      }
    })
  }, [selectedPoId, itemFields.length, poLineByRawMaterialId, getValues, setValue])

  // When a PO is selected, restrict the raw-material dropdown to that PO's items only (QA #65).
  // Falls back to the full list when no PO is selected yet.
  const selectableRawMaterials =
    selectedPoId && poLineByRawMaterialId.size > 0
      ? rawMaterials.filter(rm => poLineByRawMaterialId.has(rm.id))
      : rawMaterials

  const toggleItemExpanded = (index: number) => {
    setExpandedItems(prev => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  // Expand every item so field-level required errors inside the collapsed batch
  // section become visible when a submit is blocked (QA #4).
  const expandAllItems = () =>
    setExpandedItems(new Set(itemFields.map((_, i) => i)))

  const addItem = () => {
    const newIndex = itemFields.length
    appendItem({
      rawMaterialId: '',
      uomId: '',
      expectedQuantity: '',
      receivedQuantity: '',
      specifications: '',
      receivingNotes: '',
      batches: [{ siteId: '', quantity: '' }],
    })
    setExpandedItems(prev => new Set(prev).add(newIndex))
    setItemsError(null)
  }

  // Fires when react-hook-form field validation fails. Expand every item so the
  // inline required messages inside collapsed batch sections are visible (QA #4).
  const onInvalid = () => {
    expandAllItems()
  }

  const onSubmit = async (data: GrnFormData) => {
    if (data.items.length === 0) {
      // No items at all — surface an inline required message (the submit button is no
      // longer disabled, so onSubmit runs and the user gets clear feedback — QA #4).
      setItemsError('Add at least one item with a raw material and one storage batch.')
      toast.error('Please add at least one item')
      return
    }
    setItemsError(null)

    // Validate batch quantity sums
    for (let i = 0; i < data.items.length; i++) {
      const item = data.items[i]
      // A raw material must be selected for every item (QA #4).
      if (!item.rawMaterialId) {
        expandAllItems()
        toast.error(`Item ${i + 1}: please select a raw material.`)
        return
      }
      if (!item.uomId) {
        expandAllItems()
        toast.error(
          `Item ${i + 1}: unit of measure is missing. Edit the raw material and assign a UOM, then try again.`,
        )
        return
      }
      // Every item needs at least one batch, and each batch needs a site + quantity.
      // Batch fields are only mounted (and thus RHF-validated) when the item is expanded,
      // so validate them here too as a safety net for collapsed items (QA #4).
      if (item.batches.length === 0) {
        expandAllItems()
        toast.error(`Item ${i + 1}: at least one batch is required`)
        return
      }
      for (let b = 0; b < item.batches.length; b++) {
        const batch = item.batches[b]
        if (!batch.siteId) {
          expandAllItems()
          toast.error(`Item ${i + 1}, batch ${b + 1}: a site is required.`)
          return
        }
        if (!batch.quantity || Number(batch.quantity) < 0.01) {
          expandAllItems()
          toast.error(`Item ${i + 1}, batch ${b + 1}: a quantity is required.`)
          return
        }
      }
      // Received quantity cannot exceed the remaining (ordered − already received) qty.
      const poLine = poLineByRawMaterialId.get(item.rawMaterialId)
      if (poLine != null) {
        const ordered = Number(poLine.quantity) || 0
        const received = Number(poLine.receivedQty) || 0
        const remaining = Math.max(ordered - received, 0)
        if (Number(item.receivedQuantity) > remaining) {
          toast.error(
            `Item ${i + 1}: Received quantity cannot exceed the remaining ${remaining}.`
          )
          return
        }
      }
      const batchTotal = item.batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0)
      if (Math.abs(batchTotal - Number(item.receivedQuantity)) > 0.001) {
        toast.error(
          `Item ${i + 1}: batch quantities (${batchTotal}) must equal received quantity (${item.receivedQuantity})`
        )
        return
      }
    }

    try {
      const dto: CreateGrnDto = {
        receivingType: data.receivingType,
        purchaseOrderId: data.purchaseOrderId,
        supplierId: data.supplierId || undefined,
        receivedDate: new Date(data.receivedDate).toISOString(),
        vehicleDetails: data.vehicleDetails || undefined,
        deliveryNoteNumber: data.deliveryNoteNumber || undefined,
        notes: data.notes || undefined,
        items: data.items.map(item => ({
          rawMaterialId: item.rawMaterialId,
          uomId: item.uomId,
          expectedQuantity: resolveExpectedQuantity(
            item.rawMaterialId,
            poLineByRawMaterialId,
            item.expectedQuantity,
          ),
          receivedQuantity: Number(item.receivedQuantity),
          specifications: item.specifications || undefined,
          receivingNotes: item.receivingNotes || undefined,
          batches: item.batches.map(batch => ({
            siteId: batch.siteId,
            quantity: Number(batch.quantity),
            manufacturingDate: batch.manufacturingDate || undefined,
            expiryDate: batch.expiryDate || undefined,
            unitCost: batch.unitCost ? Number(batch.unitCost) : undefined,
            notes: batch.notes || undefined,
          })),
        })),
      }

      await createMutation.mutateAsync(dto)
      toast.success('GRN created successfully')
      router.push('/dashboard/factory/receiving')
    } catch (error: unknown) {
      console.error('Error creating GRN:', error)
      toast.error(getApiErrorMessage(error, 'Failed to create GRN'))
    }
  }

  return (
    <ProtectedRoute requiredPermission="grn.create">
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="space-y-6 min-w-0 max-w-full overflow-x-hidden">
            {/* Header */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard/factory/receiving')}
                className="self-start text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div className="min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Create GRN</h1>
                <p className="text-gray-600 mt-1 text-sm sm:text-base">
                  Record incoming materials — Goods Receipt Note
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6 min-w-0">
              {/* GRN Header */}
              <Card className="factory-light-card">
                <CardHeader>
                  <CardTitle className="text-gray-900">Receiving Information</CardTitle>
                  <CardDescription className="text-gray-600">
                    Purchase order and delivery details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Receiving Type */}
                    <div>
                      <Label className="text-gray-700 block mb-1">Receiving Type *</Label>
                      <Controller
                        control={control}
                        name="receivingType"
                        rules={{ required: 'Receiving type is required' }}
                        render={({ field }) => (
                          <Select value={field.value || undefined} onValueChange={field.onChange}>
                            <SelectTrigger className="mt-1 border-gray-300 text-gray-900">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                              <SelectItem value="PURCHASE_ORDER">Purchase Order</SelectItem>
                              <SelectItem value="RETURN">Return</SelectItem>
                              <SelectItem value="PRODUCTION_RETURN">Production Return</SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.receivingType && (
                        <p className="text-red-500 text-xs mt-1">{errors.receivingType.message}</p>
                      )}
                    </div>

                    {/* Purchase Order */}
                    <div>
                      <Label className="text-gray-700">Purchase Order *</Label>
                      <Controller
                        control={control}
                        name="purchaseOrderId"
                        rules={{ required: 'Purchase order is required' }}
                        render={({ field }) => (
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="mt-1 border-gray-300">
                              <SelectValue placeholder="Select purchase order" />
                            </SelectTrigger>
                            <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                              {purchaseOrders.map((po) => (
                                <SelectItem key={po.id} value={po.id}>
                                  {po.orderNumber}
                                  {po.supplier?.name ? ` — ${po.supplier.name}` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.purchaseOrderId && (
                        <p className="text-red-500 text-xs mt-1">{errors.purchaseOrderId.message}</p>
                      )}
                    </div>

                    {/* Supplier */}
                    <div>
                      <Label className="text-gray-700">Supplier</Label>
                      {selectedPo?.supplier?.name ? (
                        <div className="mt-1 px-3 py-2 border border-gray-200 rounded-md bg-gray-50 text-gray-700 text-sm">
                          {selectedPo.supplier.name}
                        </div>
                      ) : (
                        <Controller
                          control={control}
                          name="supplierId"
                          render={({ field }) => (
                            <Select value={field.value || undefined} onValueChange={v => field.onChange(v === 'none' ? '' : v)}>
                              <SelectTrigger className="mt-1 border-gray-300">
                                <SelectValue placeholder="Select Supplier" />
                              </SelectTrigger>
                              <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                                <SelectItem value="none">— No supplier —</SelectItem>
                                {(suppliers as any[]).map((s: any) => (
                                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                      )}
                    </div>

                    {/* Received Date */}
                    <div>
                      <Label htmlFor="receivedDate" className="text-gray-700">Received Date *</Label>
                      <Input
                        id="receivedDate"
                        type="date"
                        {...register('receivedDate', { required: 'Received date is required' })}
                        className="mt-1 border-gray-300"
                      />
                      {errors.receivedDate && (
                        <p className="text-red-500 text-xs mt-1">{errors.receivedDate.message}</p>
                      )}
                    </div>

                    {/* Delivery Note Number */}
                    <div>
                      <Label htmlFor="deliveryNoteNumber" className="text-gray-700">Delivery Note Number</Label>
                      <Input
                        id="deliveryNoteNumber"
                        {...register('deliveryNoteNumber')}
                        placeholder="DN-XXXXX"
                        className="mt-1 border-gray-300"
                      />
                    </div>

                    {/* Vehicle Details */}
                    <div>
                      <Label htmlFor="vehicleDetails" className="text-gray-700">Vehicle Details</Label>
                      <Input
                        id="vehicleDetails"
                        {...register('vehicleDetails')}
                        placeholder="Truck / plate number..."
                        className="mt-1 border-gray-300"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes" className="text-gray-700">Notes</Label>
                    <Textarea
                      id="notes"
                      {...register('notes')}
                      placeholder="Additional notes or observations..."
                      className="mt-1 border-gray-300"
                      rows={3}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Items Section */}
              <Card className="factory-light-card">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <CardTitle className="text-gray-900">Received Items</CardTitle>
                      <CardDescription className="text-gray-600">
                        Line items load from the purchase order automatically. Expected is the PO
                        remaining quantity (ordered minus already received) and is read-only.
                      </CardDescription>
                    </div>
                    <Button
                      type="button"
                      onClick={addItem}
                      variant="outline"
                      className="w-full sm:w-auto shrink-0 border-green-600 text-green-600 hover:bg-green-50"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {itemFields.length === 0 ? (
                    <div className="text-center py-12">
                      <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-600 font-medium">No items added</p>
                      <p className="text-sm text-gray-500 mt-2">Click "Add Item" to start adding raw materials</p>
                      {itemsError && (
                        <p className="text-red-500 text-sm mt-3">{itemsError}</p>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {itemFields.map((field, itemIndex) => {
                        const isExpanded = expandedItems.has(itemIndex)
                        const selectedRmId = watch(`items.${itemIndex}.rawMaterialId`)
                        const selectedRm = rawMaterials.find(
                          rm => rm.id === selectedRmId
                        )
                        const receivedQty = watch(`items.${itemIndex}.receivedQuantity`) || 0
                        // PO ordered quantity for this raw material — received qty cannot exceed it (QA #2).
                        const poLine = selectedRmId ? poLineByRawMaterialId.get(selectedRmId) : undefined
                        const orderedQty = poLine ? Number(poLine.quantity) || 0 : undefined
                        // Max you can receive now = ordered − already received (the remaining).
                        const alreadyReceived = poLine ? Number(poLine.receivedQty) || 0 : 0
                        const maxReceivable =
                          orderedQty != null ? Math.max(orderedQty - alreadyReceived, 0) : undefined

                        return (
                          <Card key={field.id} className="border border-gray-200">
                            {/* Item Header Row */}
                            <div className="flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-start lg:items-center lg:flex-nowrap">
                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="p-1"
                                  onClick={() => toggleItemExpanded(itemIndex)}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                                <span className="text-sm font-semibold text-gray-700">
                                  {itemIndex + 1}.
                                </span>
                              </div>

                              {/* Raw Material */}
                              <div className="w-full min-w-0 sm:flex-1 lg:min-w-[180px]">
                                <Controller
                                  control={control}
                                  name={`items.${itemIndex}.rawMaterialId`}
                                  rules={{ required: 'Raw material is required' }}
                                  render={({ field: f }) => (
                                    <Select
                                      value={f.value}
                                      onValueChange={(val) => {
                                        f.onChange(val)
                                        const rm = rawMaterials.find(r => r.id === val)
                                        if (rm?.uom?.id) {
                                          setValue(`items.${itemIndex}.uomId`, rm.uom.id)
                                        }
                                        // Auto-fill expected/received quantity from the PO line's
                                        // remaining (ordered − already received) quantity (QA #64).
                                        const poLine = poLineByRawMaterialId.get(val)
                                        if (poLine) {
                                          const qty = getPoRemainingQuantity(poLine)
                                          setValue(`items.${itemIndex}.expectedQuantity`, qty, {
                                            shouldValidate: true,
                                          })
                                          setValue(`items.${itemIndex}.receivedQuantity`, qty, {
                                            shouldValidate: true,
                                          })
                                          setValue(`items.${itemIndex}.batches.0.quantity`, qty)
                                        }
                                      }}
                                    >
                                      <SelectTrigger className="border-gray-300">
                                        <SelectValue placeholder="Select raw material" />
                                      </SelectTrigger>
                                      <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                                        {selectableRawMaterials.length === 0 ? (
                                          <div className="px-2 py-1.5 text-sm text-gray-500">
                                            {selectedPoId ? 'No materials on this PO' : 'Select a purchase order first'}
                                          </div>
                                        ) : (
                                          selectableRawMaterials.map(rm => (
                                            <SelectItem key={rm.id} value={rm.id}>
                                              {rm.name} ({rm.code})
                                            </SelectItem>
                                          ))
                                        )}
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                                {errors.items?.[itemIndex]?.rawMaterialId && (
                                  <p className="text-red-500 text-xs mt-1">
                                    {errors.items[itemIndex]?.rawMaterialId?.message || 'Raw material is required'}
                                  </p>
                                )}
                              </div>

                              <div className="grid grid-cols-2 gap-3 w-full sm:w-auto sm:flex sm:items-start sm:gap-3 lg:shrink-0">
                              {/* Expected Qty — PO remaining quantity (read-only, auto-filled) */}
                              <div className="w-full sm:w-28">
                                <Input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  placeholder="Expected"
                                  readOnly
                                  value={
                                    poLine
                                      ? getPoRemainingQuantity(poLine)
                                      : watch(`items.${itemIndex}.expectedQuantity`) || ''
                                  }
                                  title="PO remaining quantity (auto-filled from purchase order)"
                                  className="border-gray-300 bg-gray-100 text-gray-700 cursor-not-allowed"
                                />
                                <input
                                  type="hidden"
                                  {...register(`items.${itemIndex}.expectedQuantity`, {
                                    required: 'Expected quantity is required — select a PO line item',
                                    validate: (v: string | number) =>
                                      Number(v) >= 0.01 || 'Expected quantity is required',
                                  })}
                                />
                              </div>

                              {/* Received Qty */}
                              <div className="w-full sm:w-28">
                                <Input
                                  type="number"
                                  min="0.01"
                                  step="0.01"
                                  max={maxReceivable}
                                  placeholder="Received"
                                  {...register(`items.${itemIndex}.receivedQuantity`, {
                                    required: 'Required',
                                    // Cap to the remaining quantity as the user types and notify.
                                    onChange: (e: { target: { value: string } }) => {
                                      if (maxReceivable != null && Number(e.target.value) > maxReceivable) {
                                        toast.error(
                                          `Received quantity cannot exceed the remaining ${maxReceivable}.`,
                                        )
                                        setValue(
                                          `items.${itemIndex}.receivedQuantity`,
                                          String(maxReceivable),
                                          { shouldValidate: true },
                                        )
                                      }
                                    },
                                    validate: (v: string | number) => {
                                      if (Number(v) < 0.01) return 'Required'
                                      if (maxReceivable != null && Number(v) > maxReceivable) {
                                        return `Received quantity cannot exceed the remaining ${maxReceivable}.`
                                      }
                                      return true
                                    },
                                  })}
                                  className="border-gray-300"
                                />
                                {errors.items?.[itemIndex]?.receivedQuantity && (
                                  <p className="text-red-500 text-xs mt-1">
                                    {errors.items[itemIndex]?.receivedQuantity?.message}
                                  </p>
                                )}
                              </div>

                              {/* UOM display */}
                              <span className="col-span-2 sm:col-span-1 text-sm text-gray-500 sm:w-16 sm:text-center">
                                {selectedRm?.uom?.symbol || '—'}
                              </span>
                              </div>

                              {/* Remove item */}
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItem(itemIndex)}
                                className="self-end sm:self-auto text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Item Detail (expanded) */}
                            {isExpanded && (
                              <div className="px-4 pb-4 border-t border-gray-100 pt-4 space-y-4">
                                {/* Hidden uomId field */}
                                <input
                                  type="hidden"
                                  {...register(`items.${itemIndex}.uomId`, { required: true })}
                                />

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div>
                                    <Label className="text-gray-700 text-sm">Specifications</Label>
                                    <Input
                                      {...register(`items.${itemIndex}.specifications`)}
                                      placeholder="Product specifications..."
                                      className="mt-1 border-gray-300"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-gray-700 text-sm">Receiving Notes</Label>
                                    <Input
                                      {...register(`items.${itemIndex}.receivingNotes`)}
                                      placeholder="Notes for this item..."
                                      className="mt-1 border-gray-300"
                                    />
                                  </div>
                                </div>

                                {/* Batches */}
                                <BatchesSection
                                  itemIndex={itemIndex}
                                  control={control}
                                  register={register}
                                  watch={watch}
                                  setValue={setValue}
                                  sites={sites}
                                  receivedQuantity={Number(receivedQty)}
                                  errors={errors}
                                />
                              </div>
                            )}
                          </Card>
                        )
                      })}
                    </div>
                  )}

                  {/* Summary */}
                  {itemFields.length > 0 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        Total items: <span className="font-bold text-gray-900">{itemFields.length}</span>
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pb-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/factory/receiving')}
                  className="w-full sm:w-auto border-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white"
                >
                  {createMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4 mr-2" />
                      Create GRN
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

// ─── BatchesSection sub-component ────────────────────────────────────────────

interface BatchesSectionProps {
  itemIndex: number
  control: any
  register: any
  watch: any
  setValue: any
  sites: Array<{ id: string; name: string }>
  receivedQuantity: number
  errors: any
}

function BatchesSection({
  itemIndex,
  control,
  register,
  watch,
  setValue,
  sites,
  receivedQuantity,
  errors,
}: BatchesSectionProps) {
  const batchErrors = errors?.items?.[itemIndex]?.batches
  const { fields, append, remove } = useFieldArray({
    control,
    name: `items.${itemIndex}.batches`,
  })

  const batches: BatchFormData[] = watch(`items.${itemIndex}.batches`) || []
  const batchTotal = batches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0)
  const remaining = receivedQuantity - batchTotal
  const isValid = Math.abs(remaining) < 0.001

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-2">
        <Label className="text-gray-700 text-sm font-semibold min-w-0">
          Storage Batches
          <span className={`ml-2 text-xs ${isValid ? 'text-green-600' : 'text-orange-600'}`}>
            {batchTotal.toFixed(2)} / {receivedQuantity.toFixed(2)} allocated
            {!isValid && remaining > 0 && ` (${remaining.toFixed(2)} remaining)`}
            {!isValid && remaining < 0 && ` (over by ${Math.abs(remaining).toFixed(2)})`}
          </span>
        </Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ siteId: '', quantity: '' })}
          className="w-full sm:w-auto shrink-0 border-gray-300 text-gray-700 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Batch
        </Button>
      </div>

      <div className="overflow-x-auto -mx-1 px-1">
        <Table>
          <TableHeader>
            <TableRow className="border-gray-200 bg-gray-50">
              <TableHead className="text-gray-700 font-semibold text-xs">Site *</TableHead>
              <TableHead className="text-gray-700 font-semibold text-xs">Qty *</TableHead>
              <TableHead className="text-gray-700 font-semibold text-xs">Mfg Date</TableHead>
              <TableHead className="text-gray-700 font-semibold text-xs">Expiry Date</TableHead>
              <TableHead className="text-gray-700 font-semibold text-xs">Unit Cost</TableHead>
              <TableHead className="text-gray-700 font-semibold text-xs">Notes</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fields.map((batchField, batchIndex) => (
              <TableRow key={batchField.id} className="border-gray-200">
                {/* Site */}
                <TableCell>
                  <Controller
                    control={control}
                    name={`items.${itemIndex}.batches.${batchIndex}.siteId`}
                    rules={{ required: 'Site is required' }}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="border-gray-300 min-w-[140px]">
                          <SelectValue placeholder="Select site" />
                        </SelectTrigger>
                        {/* No avoidCollisions={false}: this Select sits low in a long form,
                            so let Radix flip it up when there's no room below (was getting
                            cut off at the viewport bottom). Cap height so long lists scroll. */}
                        <SelectContent position="popper" sideOffset={4} className="max-h-60 overflow-y-auto">
                          {sites.map(site => (
                            <SelectItem key={site.id} value={site.id}>
                              {site.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {batchErrors?.[batchIndex]?.siteId && (
                    <p className="text-red-500 text-xs mt-1">
                      {batchErrors[batchIndex]?.siteId?.message || 'Site is required'}
                    </p>
                  )}
                </TableCell>
                {/* Quantity */}
                <TableCell>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    {...register(`items.${itemIndex}.batches.${batchIndex}.quantity`, {
                      required: 'Required',
                      validate: (v: string | number) => Number(v) >= 0.01 || 'Required',
                    })}
                    className="border-gray-300 w-24"
                  />
                  {batchErrors?.[batchIndex]?.quantity && (
                    <p className="text-red-500 text-xs mt-1">
                      {batchErrors[batchIndex]?.quantity?.message || 'Required'}
                    </p>
                  )}
                </TableCell>
                {/* Mfg Date */}
                <TableCell>
                  <Input
                    type="date"
                    {...register(`items.${itemIndex}.batches.${batchIndex}.manufacturingDate`)}
                    className="border-gray-300 w-36"
                  />
                </TableCell>
                {/* Expiry Date */}
                <TableCell>
                  <Input
                    type="date"
                    {...register(`items.${itemIndex}.batches.${batchIndex}.expiryDate`)}
                    className="border-gray-300 w-36"
                  />
                </TableCell>
                {/* Unit Cost */}
                <TableCell>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    {...register(`items.${itemIndex}.batches.${batchIndex}.unitCost`)}
                    placeholder="0.00"
                    className="border-gray-300 w-24"
                  />
                </TableCell>
                {/* Notes */}
                <TableCell>
                  <Input
                    {...register(`items.${itemIndex}.batches.${batchIndex}.notes`)}
                    placeholder="Batch notes..."
                    className="border-gray-300"
                  />
                </TableCell>
                {/* Remove */}
                <TableCell>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => remove(batchIndex)}
                    disabled={fields.length === 1}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
