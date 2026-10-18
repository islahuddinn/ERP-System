'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { format } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ArrowLeft, Loader2, RotateCcw } from 'lucide-react'
import {
  useCompletedSales,
  useSaleForReturn,
  useCreateSaleReturn,
  getReturnableQuantity,
  type PaymentMethod,
} from '@/hooks/useSaleReturns'
import { formatCurrency } from '@/lib/currency'

const REFUND_METHODS: PaymentMethod[] = [
  'CASH',
  'CARD',
  'MOBILE_PAYMENT',
  'BANK_TRANSFER',
  'CHEQUE',
  'CREDIT',
  'OTHER',
]

interface ReturnFormValues {
  saleId: string
  reason: string
  refundMethod: PaymentMethod | ''
  returnDate: string
  notes: string
}

interface LineState {
  selected: boolean
  quantity: string
  reason: string
}

export default function CreateSaleReturnPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetSaleId = searchParams.get('saleId') || ''

  const { data: sales = [], isLoading: salesLoading } = useCompletedSales()
  const createMutation = useCreateSaleReturn()

  const { control, handleSubmit, watch, setValue, register, reset } = useForm<ReturnFormValues>({
    defaultValues: {
      saleId: '',
      reason: '',
      // Refund method starts EMPTY so the "Select Refund Method" placeholder shows;
      // required-validation on submit blocks an empty method.
      refundMethod: '',
      // Return Date starts EMPTY — the user picks it (required on submit).
      returnDate: '',
      notes: '',
    },
  })

  const selectedSaleId = watch('saleId')
  const { data: sale, isLoading: saleLoading } = useSaleForReturn(selectedSaleId)

  // Per-line UI state keyed by saleItemId.
  const [lines, setLines] = useState<Record<string, LineState>>({})

  // Gate the preset reset until the eligible sales have loaded.
  useEffect(() => {
    if (presetSaleId && !salesLoading && sales.some((s) => s.id === presetSaleId)) {
      reset({
        saleId: presetSaleId,
        reason: '',
        refundMethod: '',
        returnDate: '',
        notes: '',
      })
    }
  }, [presetSaleId, salesLoading, sales, reset])

  // Reset the line selections whenever the chosen sale changes.
  useEffect(() => {
    setLines({})
  }, [selectedSaleId])

  const saleItems = sale?.saleItems ?? []

  // A return must never predate its sale — floor the date picker at the sale date.
  const saleDateMin = sale?.saleDate
    ? new Date(sale.saleDate).toISOString().split('T')[0]
    : undefined

  const updateLine = (saleItemId: string, patch: Partial<LineState>) => {
    setLines((prev) => {
      const base: LineState = prev[saleItemId] ?? { selected: false, quantity: '', reason: '' }
      return {
        ...prev,
        [saleItemId]: { ...base, ...patch },
      }
    })
  }

  const estimatedRefund = saleItems.reduce((sum, item) => {
    const line = lines[item.id]
    if (!line?.selected) return sum
    const qty = parseFloat(line.quantity) || 0
    const discountPerUnit =
      Number(item.quantity) > 0
        ? Number(item.itemTotalDiscountAmount || 0) / Number(item.quantity)
        : 0
    const perUnit = Number(item.unitPrice || 0) - discountPerUnit
    return sum + Math.max(0, perUnit) * qty
  }, 0)

  const onSubmit = async (values: ReturnFormValues) => {
    if (!values.saleId) {
      toast.error('Select a sale to return against')
      return
    }
    if (!values.refundMethod) {
      toast.error('Select a refund method')
      return
    }
    if (!values.returnDate) {
      toast.error('Select a return date')
      return
    }
    if (!values.reason.trim()) {
      toast.error('A return reason is required')
      return
    }
    if (values.returnDate && saleDateMin && values.returnDate < saleDateMin) {
      toast.error('Return date cannot be earlier than the sale date')
      return
    }

    const items = saleItems
      .filter((item) => lines[item.id]?.selected)
      .map((item) => ({
        saleItemId: item.id,
        quantity: parseFloat(lines[item.id]?.quantity || '0') || 0,
        reason: lines[item.id]?.reason?.trim() || undefined,
        _max: getReturnableQuantity(item),
        _name: item.itemName,
      }))

    if (items.length === 0) {
      toast.error('Select at least one item to return')
      return
    }

    const invalid = items.find((it) => it.quantity <= 0)
    if (invalid) {
      toast.error(`Enter a return quantity for "${invalid._name}"`)
      return
    }

    const overReturn = items.find((it) => it.quantity > it._max)
    if (overReturn) {
      toast.error(
        `Return quantity for "${overReturn._name}" exceeds the returnable quantity (${overReturn._max})`,
      )
      return
    }

    try {
      await createMutation.mutateAsync({
        saleId: values.saleId,
        data: {
          reason: values.reason.trim(),
          refundMethod: values.refundMethod,
          returnDate: values.returnDate || undefined,
          notes: values.notes.trim() || undefined,
          items: items.map((it) => ({
            saleItemId: it.saleItemId,
            quantity: it.quantity,
            reason: it.reason,
          })),
        },
      })
      toast.success('Sale return created')
      router.push('/dashboard/sales/returns')
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create sale return')
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <RotateCcw className="h-8 w-8 text-green-600" />
              Create Sale Return
            </h1>
            <p className="text-gray-600 mt-1">Return items from a completed sale</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
          {/* Return details */}
          <Card>
            <CardHeader>
              <CardTitle>Return Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>
                  Sale <span className="text-red-500">*</span>
                </Label>
                <Controller
                  control={control}
                  name="saleId"
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      disabled={salesLoading}
                    >
                      <SelectTrigger>
                        <SelectValue
                          placeholder={salesLoading ? 'Loading sales...' : 'Select a completed sale'}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {sales.length === 0 && !salesLoading ? (
                          <div className="px-2 py-3 text-sm text-gray-500">
                            No completed sales available.
                          </div>
                        ) : (
                          sales.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.saleNumber}
                              {s.customer?.name ? ` · ${s.customer.name}` : ''}
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Refund Method <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="refundMethod"
                    render={({ field }) => (
                      <Select
                        value={field.value || undefined}
                        onValueChange={(v) => field.onChange(v as PaymentMethod)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select Refund Method" />
                        </SelectTrigger>
                        <SelectContent>
                          {REFUND_METHODS.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m.replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Return Date <span className="text-red-500">*</span>
                  </Label>
                  <Input type="date" min={saleDateMin} {...register('returnDate')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Reason <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  {...register('reason')}
                  rows={2}
                  placeholder="Overall reason for the return..."
                />
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea {...register('notes')} rows={2} placeholder="Optional notes..." />
              </div>
            </CardContent>
          </Card>

          {/* Items */}
          <Card>
            <CardHeader>
              <CardTitle>
                Items to Return <span className="text-red-500">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!selectedSaleId ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  Select a sale to load its items.
                </p>
              ) : saleLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading sale items...
                </div>
              ) : saleItems.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">
                  This sale has no items.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="w-12" />
                      <TableHead>Item</TableHead>
                      <TableHead className="w-24 text-right">Sold Qty</TableHead>
                      <TableHead className="w-28 text-right">Returnable</TableHead>
                      <TableHead className="w-32">Return Qty</TableHead>
                      <TableHead className="w-32 text-right">Unit Price</TableHead>
                      <TableHead className="w-48">Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {saleItems.map((item) => {
                      const returnable = getReturnableQuantity(item)
                      const line = lines[item.id]
                      const disabled = returnable <= 0
                      return (
                        <TableRow key={item.id} className={disabled ? 'opacity-60' : ''}>
                          <TableCell>
                            <Checkbox
                              checked={!!line?.selected}
                              disabled={disabled}
                              onCheckedChange={(checked) =>
                                updateLine(item.id, {
                                  selected: !!checked,
                                  quantity:
                                    checked && !line?.quantity
                                      ? String(returnable)
                                      : line?.quantity ?? '',
                                })
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-sm text-gray-900">{item.itemName}</div>
                            {item.sku && (
                              <div className="text-xs text-gray-400">{item.sku}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-gray-700">
                            {Number(item.quantity)}
                          </TableCell>
                          <TableCell className="text-right text-gray-700">
                            {returnable}
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="0.001"
                              step="0.001"
                              max={returnable}
                              placeholder="0"
                              disabled={disabled || !line?.selected}
                              value={line?.quantity ?? ''}
                              onChange={(e) => updateLine(item.id, { quantity: e.target.value })}
                            />
                          </TableCell>
                          <TableCell className="text-right text-gray-700">
                            {formatCurrency(Number(item.unitPrice || 0))}
                          </TableCell>
                          <TableCell>
                            <Input
                              placeholder="Optional"
                              disabled={disabled || !line?.selected}
                              value={line?.reason ?? ''}
                              onChange={(e) => updateLine(item.id, { reason: e.target.value })}
                            />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Estimated refund */}
          {selectedSaleId && saleItems.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex justify-end">
                  <div className="w-72 space-y-2 text-sm">
                    <div className="flex justify-between font-bold text-base text-gray-900">
                      <span>Estimated Refund:</span>
                      <span>{formatCurrency(Number(estimatedRefund))}</span>
                    </div>
                    <p className="text-xs text-gray-400">
                      Final amount is computed server-side.
                    </p>
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
              Create Return
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
