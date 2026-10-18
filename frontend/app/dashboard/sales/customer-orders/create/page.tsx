'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ArrowLeft, ClipboardList, Loader2, Plus, Save, Trash2 } from 'lucide-react'
import { useCreateCustomerOrder } from '@/hooks/useCustomerOrders'
import { useCustomersDropdown } from '@/hooks/useCustomers'
import { useProductsDropdown } from '@/hooks/useProducts'
import { formatCurrency } from '@/lib/currency'

interface OrderItemForm {
  productId: string
  quantity: string
  unitPrice: string
}

interface FormData {
  customerId: string
  notes: string
  items: OrderItemForm[]
}

export default function CreateCustomerOrderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const presetCustomerId = searchParams.get('customerId') || ''
  const createMutation = useCreateCustomerOrder()
  const { data: customers = [] } = useCustomersDropdown()
  const { data: products = [] } = useProductsDropdown()

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      customerId: presetCustomerId,
      notes: '',
      items: [{ productId: '', quantity: '', unitPrice: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = watch('items')

  useEffect(() => {
    if (presetCustomerId && customers.some((customer) => customer.id === presetCustomerId)) {
      setValue('customerId', presetCustomerId)
    }
  }, [presetCustomerId, customers, setValue])

  const estimatedTotal = watchedItems.reduce((sum, item) => {
    const quantity = parseFloat(item.quantity) || 0
    const unitPrice = parseFloat(item.unitPrice) || 0
    return sum + quantity * unitPrice
  }, 0)

  const onSubmit = async (data: FormData) => {
    if (!data.customerId) return
    if (data.items.length === 0) return

    const lineItems = data.items
      .filter((item) => item.productId && item.quantity)
      .map((item) => {
        const quantity = parseFloat(item.quantity)
        const unitPrice = item.unitPrice.trim() ? parseFloat(item.unitPrice) : undefined
        return {
          productId: item.productId,
          quantity,
          ...(unitPrice !== undefined && !Number.isNaN(unitPrice) ? { unitPrice } : {}),
        }
      })

    if (lineItems.length === 0) return
    if (lineItems.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0)) return

    const order = await createMutation.mutateAsync({
      customerId: data.customerId,
      items: lineItems,
      notes: data.notes.trim() || undefined,
    })
    router.push(`/dashboard/sales/customer-orders/${order.id}`)
  }

  const isLoading = createMutation.isPending

  return (
    <ProtectedRoute requiredPermission="customer-order.create">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/sales/customer-orders')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-green-600" />
              Book Shop Order
            </h1>
            <p className="text-gray-600 mt-1">
              Record a sales order at a shop visit. A pending delivery is created automatically.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-4xl">
          <Card>
            <CardHeader>
              <CardTitle>Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>
                  Shop <span className="text-red-500">*</span>
                </Label>
                <Controller
                  control={control}
                  name="customerId"
                  rules={{ required: 'Shop is required' }}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger className="mt-1.5 h-11 border-gray-300">
                        <SelectValue placeholder="Select shop" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.shopName} ({customer.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.customerId && <p className="text-sm text-red-600 mt-1">{errors.customerId.message}</p>}
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" {...register('notes')} rows={2} className="mt-1.5 border-gray-300" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Products</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ productId: '', quantity: '', unitPrice: '' })}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Line
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="w-28">Qty</TableHead>
                    <TableHead className="w-36">Unit Price</TableHead>
                    <TableHead className="w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <Controller
                          control={control}
                          name={`items.${index}.productId`}
                          rules={{ required: true }}
                          render={({ field: productField }) => (
                            <Select value={productField.value || undefined} onValueChange={productField.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select product" />
                              </SelectTrigger>
                              <SelectContent>
                                {products.map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name} ({product.code})
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
                          min="0"
                          step="any"
                          {...register(`items.${index}.quantity`, { required: true })}
                          placeholder="0"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          step="any"
                          {...register(`items.${index}.unitPrice`)}
                          placeholder="Optional"
                        />
                      </TableCell>
                      <TableCell>
                        {fields.length > 1 && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="px-6 py-3 text-xs text-gray-500 border-t border-gray-100">
                Unit price is optional — in fixed-price mode the shop&apos;s price tier applies; in free-price mode
                your branch price list is used when omitted.
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
            <p className="text-sm text-gray-600">Estimated total (if unit prices entered)</p>
            <p className="text-lg font-semibold text-gray-900">{formatCurrency(estimatedTotal)}</p>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/sales/customer-orders')}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Book Order
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
