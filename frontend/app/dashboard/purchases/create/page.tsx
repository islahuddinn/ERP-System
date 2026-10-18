'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ArrowLeft, Plus, Trash2, Loader2, ShoppingCart, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreatePurchase } from '@/hooks/usePurchases'
import { useSuppliersDropdown } from '@/hooks/useSuppliers'
import { useRawMaterialsDropdown } from '@/hooks/useRawMaterials'
import { useUsersDropdown } from '@/hooks/useUsers'
import { formatCurrency } from '@/lib/currency'

interface ItemForm {
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

export default function CreatePurchaseOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetSupplierId = searchParams.get('supplierId') || ''
  const createMutation = useCreatePurchase()
  const { data: suppliers = [] } = useSuppliersDropdown()
  const { data: rawMaterials = [] } = useRawMaterialsDropdown()
  const { data: users = [] } = useUsersDropdown()

  const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<FormData>({
    defaultValues: {
      supplierId: presetSupplierId,
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

  // Prefill supplier when arriving via a deep-link (e.g. /create?supplierId=...),
  // once the supplier exists in the loaded dropdown options.
  useEffect(() => {
    if (presetSupplierId && (suppliers as any[]).some((s: any) => s.id === presetSupplierId)) {
      setValue('supplierId', presetSupplierId)
    }
  }, [presetSupplierId, suppliers, setValue])

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
      setValue('approverIds', current.filter(id => id !== userId))
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
    const badNumberItem = data.items.find(it => {
      const q = parseFloat(it.quantity)
      const p = parseFloat(it.unitPrice)
      return isNaN(q) || q <= 0 || isNaN(p) || p < 0
    })
    if (badNumberItem) {
      toast.error('Quantity must be greater than 0 and unit price cannot be negative')
      return
    }
    // Expected Date must not be earlier than Order Date (QA #47)
    if (data.orderDate && data.expectedDate && data.expectedDate < data.orderDate) {
      toast.error('Expected Date cannot be earlier than Order Date')
      return
    }

    try {
      await createMutation.mutateAsync({
        supplierId: data.supplierId || undefined,
        referenceNo: data.referenceNo || undefined,
        orderDate: data.orderDate || undefined,
        expectedDate: data.expectedDate || undefined,
        shippingCost: data.shippingCost ? parseFloat(data.shippingCost) : undefined,
        remarks: data.remarks || undefined,
        approverIds: data.approverIds.length > 0 ? data.approverIds : undefined,
        items: data.items.map(it => ({
          rawMaterialId: it.rawMaterialId,
          quantity: parseFloat(it.quantity),
          unitPrice: parseFloat(it.unitPrice),
          notes: it.notes || undefined,
        })),
      })
      toast.success('Purchase order created')
      router.push('/dashboard/purchases')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create purchase order')
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ShoppingCart className="h-8 w-8 text-green-600" />
              Create Purchase Order
            </h1>
            <p className="text-gray-600 mt-1">Order raw materials from a supplier</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
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
                      <Select value={field.value || 'none'} onValueChange={v => field.onChange(v === 'none' ? '' : v)}>
                        <SelectTrigger>
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
                  <Input
                    type="date"
                    min={watch('orderDate') || undefined}
                    {...register('expectedDate')}
                  />
                  {watch('orderDate') && watch('expectedDate') && watch('expectedDate') < watch('orderDate') && (
                    <p className="text-xs text-red-500">Expected Date cannot be earlier than Order Date</p>
                  )}
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
                    {(watchedApprovers || []).map(id => {
                      const user = users.find((u: any) => u.id === id)
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
                    <SelectTrigger>
                      <SelectValue placeholder="Add approver..." />
                    </SelectTrigger>
                    <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
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
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Items <span className="text-red-500">*</span></CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ rawMaterialId: '', quantity: '', unitPrice: '', notes: '' })}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Item
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {fields.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No items added. Click "Add Item" to start.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead>Raw Material *</TableHead>
                      <TableHead className="w-28">Quantity *</TableHead>
                      <TableHead className="w-32">Unit Price *</TableHead>
                      <TableHead className="w-32 text-right">Total</TableHead>
                      <TableHead className="w-48">Notes</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const qty = parseFloat(watchedItems[index]?.quantity || '0') || 0
                      const price = parseFloat(watchedItems[index]?.unitPrice || '0') || 0
                      const itemErrors = errors.items?.[index]
                      return (
                        <TableRow key={field.id}>
                          <TableCell>
                            <Controller
                              control={control}
                              name={`items.${index}.rawMaterialId`}
                              rules={{ required: true }}
                              render={({ field: f }) => (
                                // Plain Radix Select (keyed by value) — the previous Popover+Command
                                // combobox did not reliably commit the click selection onto the line
                                // item (QA #1). Mirrors the edit-PO screen.
                                <Select
                                  key={f.value || `rm-${index}`}
                                  value={f.value || undefined}
                                  onValueChange={(rmId) => {
                                    f.onChange(rmId)
                                    // Auto-fill quantity (default 1) and unit price from the
                                    // selected raw material's last purchase price (QA #21).
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
                                  <SelectTrigger className={cn('w-full', !f.value && 'border-red-300 text-gray-400')}>
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
                              className={cn(itemErrors?.quantity && 'border-red-400')}
                              {...register(`items.${index}.quantity`, {
                                required: 'Required',
                                validate: v => (parseFloat(v) > 0) || 'Must be > 0',
                              })}
                            />
                            {itemErrors?.quantity && (
                              <p className="text-xs text-red-500 mt-1">{itemErrors.quantity.message as string}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder="0.00"
                              className={cn(itemErrors?.unitPrice && 'border-red-400')}
                              {...register(`items.${index}.unitPrice`, {
                                required: 'Required',
                                validate: v => (parseFloat(v) >= 0) || 'Invalid price',
                              })}
                            />
                            {itemErrors?.unitPrice && (
                              <p className="text-xs text-red-500 mt-1">{itemErrors.unitPrice.message as string}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(qty * price)}
                          </TableCell>
                          <TableCell>
                            <Input placeholder="Optional notes..." {...register(`items.${index}.notes`)} />
                          </TableCell>
                          <TableCell>
                            <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </TableCell>
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

          <div className="flex gap-3">
            <Button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Purchase Order
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
