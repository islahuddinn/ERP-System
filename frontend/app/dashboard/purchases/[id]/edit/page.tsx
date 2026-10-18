'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Plus, Trash2, Loader2, Package, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePurchase, useUpdatePurchase } from '@/hooks/usePurchases'
import { useSuppliersDropdown } from '@/hooks/useSuppliers'
import { useRawMaterialsDropdown } from '@/hooks/useRawMaterials'
import { useUsersDropdown } from '@/hooks/useUsers'
import { formatCurrency } from '@/lib/currency'

interface ItemForm {
  id?: string
  rawMaterialId: string
  quantity: string
  unitPrice: string
  notes: string
}

interface FormData {
  supplierId: string
  referenceNo: string
  orderDate: string
  expectedDate: string
  shippingCost: string
  remarks: string
  approverIds: string[]
  items: ItemForm[]
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PARTIAL: 'bg-yellow-100 text-yellow-700',
  RECEIVED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

export default function EditPurchaseOrderPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: purchaseOrder, isLoading, error } = usePurchase(id)
  const updateMutation = useUpdatePurchase()
  const { data: suppliersData = [], isSuccess: isSuppliersLoaded } = useSuppliersDropdown()
  const { data: rawMaterials = [] } = useRawMaterialsDropdown()
  const { data: users = [], isSuccess: isUsersLoaded } = useUsersDropdown()

  // Always include the order's own supplier as an option so the value prefills
  // even before (or if) the dropdown endpoint has returned.
  const suppliers = (() => {
    const list = Array.isArray(suppliersData) ? [...suppliersData] : []
    const poSupplier = purchaseOrder?.supplier
    if (poSupplier?.id && !list.some((s: any) => s.id === poSupplier.id)) {
      list.unshift({ id: poSupplier.id, name: poSupplier.name })
    }
    return list
  })()

  const { register, handleSubmit, control, watch, reset, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      supplierId: '',
      referenceNo: '',
      orderDate: '',
      expectedDate: '',
      shippingCost: '',
      remarks: '',
      approverIds: [],
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  // Gate reset() until the PO data AND the suppliers dropdown have resolved, so the
  // Supplier select is populated before the form value is applied and the saved
  // supplier shows up selected (QA #24). We intentionally do NOT block on the users
  // dropdown — if it is slow/errors, the supplier must still prefill. The effect
  // re-runs when users load to backfill the approver chips.
  useEffect(() => {
    if (!purchaseOrder || !isSuppliersLoaded) return
    const items = Array.isArray(purchaseOrder.items) ? purchaseOrder.items : []
    const existingApproverIds = Array.isArray((purchaseOrder as any).approvals)
      ? (purchaseOrder as any).approvals.map((a: any) => a.approverId ?? a.approver?.id).filter(Boolean)
      : []
    reset({
      supplierId: purchaseOrder.supplier?.id || '',
      referenceNo: (purchaseOrder as any).referenceNo || '',
      orderDate: purchaseOrder.orderDate ? purchaseOrder.orderDate.slice(0, 10) : '',
      expectedDate: purchaseOrder.expectedDate ? purchaseOrder.expectedDate.slice(0, 10) : '',
      shippingCost: purchaseOrder.shippingCost ? String(purchaseOrder.shippingCost) : '',
      remarks: (purchaseOrder as any).remarks || '',
      approverIds: existingApproverIds,
      items: items.map((item: any) => ({
        id: item.id,
        rawMaterialId: item.rawMaterial?.id || '',
        quantity: String(item.quantity),
        unitPrice: String(item.unitPrice),
        notes: item.notes || '',
      })),
    })
  }, [purchaseOrder, isSuppliersLoaded, isUsersLoaded, reset])

  const watchedItems = watch('items')
  const watchedApprovers = watch('approverIds')
  const subtotal = watchedItems.reduce((sum, item) => {
    const qty = parseFloat(item.quantity) || 0
    const price = parseFloat(item.unitPrice) || 0
    return sum + qty * price
  }, 0)
  const shipping = parseFloat(watch('shippingCost') || '0') || 0
  const total = subtotal + shipping

  const toggleApprover = (userId: string) => {
    const current = watchedApprovers || []
    if (current.includes(userId)) {
      setValue('approverIds', current.filter(i => i !== userId))
    } else {
      setValue('approverIds', [...current, userId])
    }
  }

  const onSubmit = async (data: FormData) => {
    if (data.items.length === 0) {
      toast.error('Add at least one item')
      return
    }
    const invalidItem = data.items.find(it => !it.rawMaterialId || !it.quantity || !it.unitPrice)
    if (invalidItem) {
      toast.error('All items must have a raw material, quantity, and unit price')
      return
    }

    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          supplierId: data.supplierId || undefined,
          referenceNo: data.referenceNo || null,
          orderDate: data.orderDate || undefined,
          expectedDate: data.expectedDate || null,
          shippingCost: data.shippingCost ? parseFloat(data.shippingCost) : 0,
          remarks: data.remarks || null,
          approverIds: data.approverIds.length > 0 ? data.approverIds : undefined,
          items: data.items.map(it => ({
            id: it.id,
            rawMaterialId: it.rawMaterialId,
            quantity: parseFloat(it.quantity),
            unitPrice: parseFloat(it.unitPrice),
            notes: it.notes || null,
          })),
        },
      })
      toast.success('Purchase order updated')
      // Return to the PO list on success rather than staying on the edit screen (QA #52).
      router.push('/dashboard/purchases')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update purchase order')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !purchaseOrder) {
    return (
      <Alert>
        <AlertDescription>Failed to load purchase order. Please try again.</AlertDescription>
      </Alert>
    )
  }

  const isDraft = purchaseOrder.status === 'DRAFT'

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="h-8 w-8 text-green-600" />
            Edit Purchase Order
          </h1>
          <p className="text-gray-600 mt-1 font-mono text-sm">{purchaseOrder.orderNumber}</p>
        </div>
        <Badge className={STATUS_COLORS[purchaseOrder.status] ?? 'bg-gray-100 text-gray-700'}>
          {purchaseOrder.status}
        </Badge>
      </div>

      {!isDraft && (
        <Alert>
          <AlertDescription>
            Only <strong>DRAFT</strong> orders can be edited. This order is in <strong>{purchaseOrder.status}</strong> status.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
        <fieldset disabled={!isDraft} className="space-y-6">
          {/* Order Details */}
          <Card>
            <CardHeader><CardTitle>Order Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Controller
                    control={control}
                    name="supplierId"
                    render={({ field }) => (
                      <Select key={field.value || 'k'} value={field.value || undefined} onValueChange={v => field.onChange(v === '__none__' ? '' : v)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">— No supplier —</SelectItem>
                          {(suppliers as any[]).map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Reference No.</Label>
                  <Input {...register('referenceNo')} placeholder="REF-2026-001" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Order Date</Label>
                  <Input type="date" {...register('orderDate')} />
                </div>
                <div className="space-y-2">
                  <Label>Expected Date</Label>
                  <Input type="date" {...register('expectedDate')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Remarks</Label>
                <Textarea {...register('remarks')} rows={2} placeholder="Optional notes..." />
              </div>

              {/* Approvers */}
              {users.length > 0 && (
                <div className="space-y-2">
                  <Label>Approvers <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {(watchedApprovers || []).map(uid => {
                      const user = users.find((u: any) => u.id === uid)
                      return user ? (
                        <Badge key={uid} variant="secondary" className="flex items-center gap-1">
                          {user.name}
                          <button type="button" onClick={() => toggleApprover(uid)} className="ml-1 hover:text-red-600">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ) : null
                    })}
                  </div>
                  <Select onValueChange={toggleApprover} value="">
                    <SelectTrigger>
                      <SelectValue placeholder="Add approver..." />
                    </SelectTrigger>
                    <SelectContent>
                      {(users as any[])
                        .filter((u: any) => !(watchedApprovers || []).includes(u.id))
                        .map((u: any) => (
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

          {/* Items */}
          <Card className="overflow-hidden">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Items <span className="text-red-500">*</span></CardTitle>
                {isDraft && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ rawMaterialId: '', quantity: '', unitPrice: '', notes: '' })}
                  >
                    <Plus className="h-4 w-4 mr-1" /> Add Item
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {fields.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No items. Click "Add Item" to start.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Raw Material *</TableHead>
                      <TableHead className="w-28">Quantity *</TableHead>
                      <TableHead className="w-32">Unit Price *</TableHead>
                      <TableHead className="w-32 text-right">Total</TableHead>
                      <TableHead className="w-48">Notes</TableHead>
                      {isDraft && <TableHead className="w-12" />}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const qty = parseFloat(watchedItems[index]?.quantity || '0') || 0
                      const price = parseFloat(watchedItems[index]?.unitPrice || '0') || 0
                      return (
                        <TableRow key={field.id}>
                          <TableCell>
                            <Controller
                              control={control}
                              name={`items.${index}.rawMaterialId`}
                              rules={{ required: true }}
                              render={({ field: f }) => (
                                // Mirror create-PO: a plain Radix Select keyed by its value so
                                // the saved raw material prefills on reopen and selection works
                                // reliably (QA #48, #50). Keying remounts the Select once data
                                // loads so the saved value shows selected.
                                <Select
                                  key={f.value || `rm-${index}`}
                                  value={f.value || undefined}
                                  disabled={!isDraft}
                                  onValueChange={(rmId) => {
                                    f.onChange(rmId)
                                    // Auto-fill quantity (default 1) and unit price from the
                                    // selected raw material's last purchase price (QA #51).
                                    const rm = (rawMaterials as any[]).find((r: any) => r.id === rmId)
                                    if (!watchedItems[index]?.quantity) {
                                      setValue(`items.${index}.quantity`, '1', { shouldValidate: true })
                                    }
                                    // Always refresh the unit price to the newly selected
                                    // material's last purchase price (clear it if that material
                                    // has none), so changing the material updates the price
                                    // instead of keeping the previous material's value.
                                    const lastPrice = rm?.lastPurchasePrice
                                    setValue(
                                      `items.${index}.unitPrice`,
                                      lastPrice != null && lastPrice !== '' ? String(lastPrice) : '',
                                      { shouldValidate: true },
                                    )
                                  }}
                                >
                                  <SelectTrigger
                                    className={cn('w-full', !f.value && 'border-red-300 text-gray-400')}
                                  >
                                    <SelectValue placeholder="Select raw material" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {(rawMaterials as any[]).map((rm: any) => (
                                      <SelectItem key={rm.id} value={rm.id}>
                                        {rm.name} ({rm.code}){rm.uom ? ` · ${rm.uom.symbol}` : ''}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              placeholder="0.00"
                              {...register(`items.${index}.quantity`, { required: true })}
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0.01"
                              step="0.01"
                              placeholder="0.00"
                              {...register(`items.${index}.unitPrice`, { required: true })}
                            />
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(qty * price)}
                          </TableCell>
                          <TableCell>
                            <Input placeholder="Optional notes..." {...register(`items.${index}.notes`)} />
                          </TableCell>
                          {isDraft && (
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
                                disabled={fields.length === 1}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Totals */}
          {fields.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-end">
                  <div className="w-72 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Shipping:</span>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-32 h-7 text-sm"
                        {...register('shippingCost')}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="flex justify-between font-bold text-base text-gray-900 pt-2 border-t">
                      <span>Total:</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </fieldset>

        <div className="flex gap-3">
          {isDraft ? (
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          ) : (
            <Button type="button" disabled>
              Cannot edit — not in DRAFT
            </Button>
          )}
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
