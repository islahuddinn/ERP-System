'use client'

import { useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ArrowLeft, Plus, Trash2, Package, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { useProductsDropdown } from '@/hooks/useProducts'
import {
  useSale,
  useCustomersDropdown,
  useUpdateSale,
  UpdateSaleDto,
} from '@/hooks/useSales'
import { formatCurrency } from '@/lib/currency'

const saleItemSchema = z.object({
  productId: z.string().min(1, 'Product is required'),
  quantity: z.coerce.number().min(0.001, 'Quantity must be greater than 0'),
  unitPrice: z.coerce.number().min(0, 'Unit price must be 0 or more'),
  itemDiscountPercentage: z.coerce.number().min(0, 'Discount must be 0 or more').optional(),
  itemDiscountAmount: z.coerce.number().min(0, 'Discount must be 0 or more').optional(),
  notes: z.string().optional(),
})

const saleSchema = z.object({
  customerId: z.string().optional(),
  saleDate: z.string().min(1, 'Sale date is required'),
  discountPercentage: z.coerce.number().min(0).optional(),
  discountAmount: z.coerce.number().min(0).optional(),
  taxPercentage: z.coerce.number().min(0).optional(),
  taxAmount: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
  items: z.array(saleItemSchema).min(1, 'At least one item is required'),
})

type SaleForm = z.infer<typeof saleSchema>

export default function EditSalePage() {
  const router = useRouter()
  const params = useParams()
  const saleId = params?.id as string

  const { data: sale, isLoading: saleLoading } = useSale(saleId)
  const { data: customers = [], isLoading: customersLoading } = useCustomersDropdown()
  const { data: products = [] } = useProductsDropdown()
  const updateMutation = useUpdateSale()

  const isDraft = sale?.status === 'DRAFT'
  const isCompleted = sale?.status === 'COMPLETED'

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<SaleForm>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      customerId: undefined,
      saleDate: format(new Date(), 'yyyy-MM-dd'),
      discountPercentage: 0,
      discountAmount: 0,
      taxPercentage: 0,
      taxAmount: 0,
      notes: '',
      items: [],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  // Gate reset() until both the sale and the customer dropdown options have
  // loaded so the pre-selected customer resolves to a real option.
  useEffect(() => {
    if (!sale || customersLoading) return
    reset({
      customerId: sale.customerId || undefined,
      saleDate: sale.saleDate ? format(new Date(sale.saleDate), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      discountPercentage: Number(sale.discountPercentage) || 0,
      discountAmount: Number(sale.discountAmount) || 0,
      taxPercentage: Number(sale.taxPercentage) || 0,
      taxAmount: Number(sale.taxAmount) || 0,
      notes: sale.notes || '',
      items: (sale.saleItems || []).map((item) => ({
        productId: item.productId || '',
        quantity: Number(item.quantity) || 0,
        unitPrice: Number(item.unitPrice) || 0,
        itemDiscountPercentage: Number(item.itemDiscountPercentage) || 0,
        itemDiscountAmount: Number(item.itemDiscountAmount) || 0,
        notes: item.notes || '',
      })),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sale, customersLoading])

  const watchedItems = watch('items')
  const watchedDiscountPct = watch('discountPercentage') || 0
  const watchedDiscountAmt = watch('discountAmount') || 0
  const watchedTaxPct = watch('taxPercentage') || 0
  const watchedTaxAmt = watch('taxAmount') || 0

  const totals = useMemo(() => {
    let subtotal = 0
    let itemsDiscountAmount = 0
    for (const item of watchedItems || []) {
      const qty = Number(item?.quantity) || 0
      const price = Number(item?.unitPrice) || 0
      const lineSubtotal = qty * price
      // itemTotalDiscountAmount = (lineSubtotal × pct/100) + flat amount
      const itemDiscountFromPct = lineSubtotal * ((Number(item?.itemDiscountPercentage) || 0) / 100)
      const itemDiscountFromAmt = Number(item?.itemDiscountAmount) || 0
      subtotal += lineSubtotal
      itemsDiscountAmount += itemDiscountFromPct + itemDiscountFromAmt
    }
    const netSubtotal = subtotal - itemsDiscountAmount
    const saleDiscountFromPct = netSubtotal * (Number(watchedDiscountPct) / 100)
    const totalSaleDiscount = saleDiscountFromPct + (Number(watchedDiscountAmt) || 0)
    const totalDiscountAmount = itemsDiscountAmount + totalSaleDiscount
    const taxableAmount = netSubtotal - totalSaleDiscount
    const totalTaxAmount = taxableAmount * (Number(watchedTaxPct) / 100) + (Number(watchedTaxAmt) || 0)
    const totalAmount = taxableAmount + totalTaxAmount
    return {
      subtotal,
      itemsDiscountAmount,
      totalSaleDiscount,
      totalDiscountAmount,
      taxableAmount,
      totalTaxAmount,
      totalAmount,
    }
  }, [watchedItems, watchedDiscountPct, watchedDiscountAmt, watchedTaxPct, watchedTaxAmt])

  const addItem = () => {
    append({
      productId: '',
      quantity: 1,
      unitPrice: 0,
      itemDiscountPercentage: 0,
      itemDiscountAmount: 0,
      notes: '',
    })
  }

  const onProductChange = (index: number, productId: string) => {
    setValue(`items.${index}.productId`, productId)
    const product = products.find((p) => p.id === productId)
    if (product?.sellingPrice !== undefined && product?.sellingPrice !== null) {
      setValue(`items.${index}.unitPrice`, Number(product.sellingPrice) || 0)
    }
  }

  const onSubmit = (data: SaleForm) => {
    // For DRAFT we send a full replacement (items + pricing fields must travel
    // together per the API). For COMPLETED only notes are accepted.
    // Send notes as an explicit empty string (not undefined) when cleared so the
    // backend overwrites the old value — the repository only skips notes when it
    // is strictly undefined, so '' correctly persists an empty description.
    const normalizedNotes = data.notes?.trim() ? data.notes.trim() : ''

    const payload: UpdateSaleDto = isCompleted
      ? { notes: normalizedNotes }
      : {
          customerId: data.customerId && data.customerId.trim() !== '' ? data.customerId : undefined,
          saleDate: data.saleDate,
          discountPercentage: Number(data.discountPercentage) || 0,
          discountAmount: Number(data.discountAmount) || 0,
          taxPercentage: Number(data.taxPercentage) || 0,
          taxAmount: Number(data.taxAmount) || 0,
          notes: normalizedNotes,
          items: data.items.map((item) => ({
            productId: item.productId,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice),
            itemDiscountPercentage: Number(item.itemDiscountPercentage) || 0,
            itemDiscountAmount: Number(item.itemDiscountAmount) || 0,
            notes: item.notes && item.notes.trim() !== '' ? item.notes : undefined,
          })),
        }

    updateMutation.mutate(
      { saleId, data: payload },
      {
        onSuccess: () => {
          toast.success('Sale updated successfully')
          router.push(`/dashboard/sales/${saleId}`)
        },
        onError: (error: any) => {
          const message =
            error?.response?.data?.message ||
            error?.response?.data?.details?.message ||
            error?.message ||
            'Failed to update sale'
          toast.error(Array.isArray(message) ? message[0] : message)
        },
      },
    )
  }

  if (saleLoading || !sale) {
    return (
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        </div>
      </div>
    )
  }

  if (sale.status === 'CANCELLED') {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => router.back()} className="text-gray-600">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="py-12 text-center">
            <p className="text-gray-600">Cancelled sales cannot be modified.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Edit Sale {sale.saleNumber}</h1>
          <p className="text-gray-600">
            {isCompleted
              ? 'Completed sale — only notes can be edited'
              : 'Update sale details and items'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Sale Details */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100 bg-gray-50/50">
            <CardTitle className="text-gray-900">Sale Details</CardTitle>
            <CardDescription>Customer and basic information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-700 font-medium">Customer</Label>
                <Controller
                  control={control}
                  name="customerId"
                  render={({ field }) => (
                    <Select
                      key={field.value || 'k'}
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      disabled={customersLoading || isCompleted}
                    >
                      <SelectTrigger className="bg-white border-gray-300 h-11">
                        <SelectValue placeholder="Walk-in / Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                            {c.phone ? ` · ${c.phone}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="saleDate" className="text-gray-700 font-medium">
                  Sale Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="saleDate"
                  type="date"
                  disabled={isCompleted}
                  {...register('saleDate')}
                  className="bg-white border-gray-300 h-11"
                />
                {errors.saleDate && (
                  <p className="text-red-500 text-sm mt-1">{errors.saleDate.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes" className="text-gray-700 font-medium">
                Notes
              </Label>
              <Textarea
                id="notes"
                {...register('notes')}
                placeholder="Additional notes about this sale..."
                className="bg-white border-gray-300 resize-none"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {!isCompleted && (
          <>
            {/* Line Items */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-gray-900">Items</CardTitle>
                  <CardDescription>Products to sell</CardDescription>
                </div>
                <Button
                  type="button"
                  onClick={addItem}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-green-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              </CardHeader>
              <CardContent className="pt-6">
                {errors.items?.message && (
                  <p className="text-red-500 text-sm mb-3">{errors.items.message}</p>
                )}
                {fields.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No items added yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50 border-gray-200">
                          <TableHead className="font-semibold text-gray-700 min-w-[220px]">Product</TableHead>
                          <TableHead className="font-semibold text-gray-700">Qty</TableHead>
                          <TableHead className="font-semibold text-gray-700">Unit Price</TableHead>
                          <TableHead className="font-semibold text-gray-700">Disc %</TableHead>
                          <TableHead className="font-semibold text-gray-700">Disc Amount</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-right">Line Total</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fields.map((field, index) => {
                          const qty = Number(watchedItems?.[index]?.quantity) || 0
                          const price = Number(watchedItems?.[index]?.unitPrice) || 0
                          const lineSubtotal = qty * price
                          const discPct = Number(watchedItems?.[index]?.itemDiscountPercentage) || 0
                          const discAmt = Number(watchedItems?.[index]?.itemDiscountAmount) || 0
                          const lineTotal = lineSubtotal - (lineSubtotal * (discPct / 100) + discAmt)
                          return (
                            <TableRow key={field.id} className="border-gray-100">
                              <TableCell>
                                <Controller
                                  control={control}
                                  name={`items.${index}.productId`}
                                  render={({ field: pField }) => (
                                    <Select
                                      value={pField.value || undefined}
                                      onValueChange={(v) => onProductChange(index, v)}
                                    >
                                      <SelectTrigger className="bg-white border-gray-300 h-9 min-w-[200px]">
                                        <SelectValue placeholder="Select product" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {products.map((p) => (
                                          <SelectItem key={p.id} value={p.id}>
                                            {p.name}
                                            {p.code ? ` (${p.code})` : ''}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                />
                                {errors.items?.[index]?.productId && (
                                  <p className="text-red-500 text-xs mt-1">
                                    {errors.items[index]?.productId?.message}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.001"
                                  min="0.001"
                                  {...register(`items.${index}.quantity`)}
                                  className="w-20 bg-white border-gray-300 h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  {...register(`items.${index}.unitPrice`)}
                                  className="w-24 bg-white border-gray-300 h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  {...register(`items.${index}.itemDiscountPercentage`)}
                                  className="w-20 bg-white border-gray-300 h-9"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  {...register(`items.${index}.itemDiscountAmount`)}
                                  className="w-24 bg-white border-gray-300 h-9"
                                />
                              </TableCell>
                              <TableCell className="text-right font-medium text-gray-900">
                                {formatCurrency(lineTotal)}
                              </TableCell>
                              <TableCell className="text-center">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => remove(index)}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Discounts, Tax & Totals */}
            <Card className="bg-white border-gray-200 shadow-sm">
              <CardHeader className="border-b border-gray-100 bg-gray-50/50">
                <CardTitle className="text-gray-900">Discount, Tax &amp; Totals</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Discount %</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register('discountPercentage')}
                        className="bg-white border-gray-300 h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Discount Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register('discountAmount')}
                        className="bg-white border-gray-300 h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Tax %</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register('taxPercentage')}
                        className="bg-white border-gray-300 h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-gray-700 font-medium">Tax Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...register('taxAmount')}
                        className="bg-white border-gray-300 h-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 md:border-l md:pl-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium text-gray-900">{formatCurrency(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Item Discounts</span>
                      <span className="text-red-600">- {formatCurrency(totals.itemsDiscountAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Sale Discount</span>
                      <span className="text-red-600">- {formatCurrency(totals.totalSaleDiscount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Taxable Amount</span>
                      <span className="font-medium text-gray-900">{formatCurrency(totals.taxableAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax</span>
                      <span className="font-medium text-gray-900">{formatCurrency(totals.totalTaxAmount)}</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between">
                      <span className="font-semibold text-gray-900">Total</span>
                      <span className="font-bold text-lg text-gray-900">{formatCurrency(totals.totalAmount)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            className="bg-green-600 hover:bg-green-700 text-white shadow-sm min-w-[120px]"
          >
            {updateMutation.isPending ? (
              <>
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
