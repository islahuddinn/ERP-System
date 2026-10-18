'use client'

import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { ArrowLeft, ClipboardList, Loader2, Plus, Save, Trash2 } from 'lucide-react'
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
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useCreateBranchStockRequest } from '@/hooks/useBranchStockRequests'
import { useProductsDropdown } from '@/hooks/useProducts'

interface RequestItemForm {
  productId: string
  quantity: string
}

interface FormData {
  notes: string
  items: RequestItemForm[]
}

export default function CreateBranchStockRequestPage() {
  const router = useRouter()
  const createMutation = useCreateBranchStockRequest()
  const { data: products = [] } = useProductsDropdown()

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      notes: '',
      items: [{ productId: '', quantity: '' }],
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })

  const onSubmit = async (data: FormData) => {
    const lineItems = data.items
      .filter((item) => item.productId && item.quantity)
      .map((item) => ({
        productId: item.productId,
        quantity: parseFloat(item.quantity),
      }))

    if (lineItems.length === 0) return
    if (lineItems.some((item) => !Number.isFinite(item.quantity) || item.quantity <= 0)) return

    const request = await createMutation.mutateAsync({
      items: lineItems,
      notes: data.notes.trim() || undefined,
    })
    router.push(`/dashboard/sales/branch-stock-requests/${request.id}`)
  }

  const isLoading = createMutation.isPending

  return (
    <ProtectedRoute requiredPermission="branch-stock-request.create">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/sales/branch-stock-requests')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <ClipboardList className="h-8 w-8 text-green-600" />
              New Branch Stock Request
            </h1>
            <p className="text-gray-600 mt-1">
              Request stock from your parent branch or the Factory. Prices are resolved
              server-side — the request fails if any product has no price for your branch tier.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ productId: '', quantity: '' })}
                disabled={isLoading}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Item
              </Button>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[240px]">Product</TableHead>
                    <TableHead className="w-[160px]">Quantity</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => (
                    <TableRow key={field.id}>
                      <TableCell>
                        <Controller
                          control={control}
                          name={`items.${index}.productId`}
                          rules={{ required: 'Select a product' }}
                          render={({ field: selectField }) => (
                            <Select value={selectField.value} onValueChange={selectField.onChange}>
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
                        {errors.items?.[index]?.productId && (
                          <p className="text-xs text-red-600 mt-1">
                            {errors.items[index]?.productId?.message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min={0.01}
                          step="any"
                          placeholder="Qty"
                          {...register(`items.${index}.quantity`, {
                            required: 'Enter quantity',
                            min: { value: 0.01, message: 'Must be greater than zero' },
                          })}
                          disabled={isLoading}
                        />
                        {errors.items?.[index]?.quantity && (
                          <p className="text-xs text-red-600 mt-1">
                            {errors.items[index]?.quantity?.message}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => remove(index)}
                          disabled={isLoading || fields.length === 1}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="notes" className="sr-only">
                Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Optional notes for the fulfiller"
                {...register('notes')}
                disabled={isLoading}
                rows={3}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white min-w-[160px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Submit Request
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
