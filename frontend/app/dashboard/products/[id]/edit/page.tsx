'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useProduct, useUpdateProduct } from '@/hooks/useProducts'
import { useUOMsDropdown } from '@/hooks/useMasterData'
import { ArrowLeft, Loader2, Plus, X } from 'lucide-react'

interface ProductFormData {
  name: string
  code: string
  type: 'FINISHED_GOOD' | 'SEMI_FINISHED' | 'CONSUMABLE' | 'SERVICE'
  uomId: string
  barcode?: string
  description?: string
  sellingPrice?: number
  // Held as strings so the inputs can start empty (and be fully cleared) instead
  // of snapping back to 0 — cleared min/max stock persists as EMPTY on reopen (#5).
  minStock?: string
  maxStock?: string
  reorderLevel?: string
  isActive: boolean
}

/** True when the string parses as a valid absolute URL — #12. */
function isValidUrl(value: string): boolean {
  try {
    // eslint-disable-next-line no-new
    new URL(value)
    return true
  } catch {
    return false
  }
}

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: product, isLoading } = useProduct(id)
  const updateMutation = useUpdateProduct()
  const { data: uoms = [], isLoading: uomsLoading } = useUOMsDropdown()

  const [images, setImages] = useState<string[]>([])
  const [attributes, setAttributes] = useState<{ name: string; value: string; unit?: string }[]>([])
  // Flip true once the form is reset with the loaded product + options, so the
  // Radix <Select>s remount with their value already set (avoids the
  // uncontrolled→controlled bug that leaves Type/UOM blank in edit mode).
  const [prefilled, setPrefilled] = useState(false)

  const { register, handleSubmit, control, reset, formState: { errors } } = useForm<ProductFormData>({
    defaultValues: {
      name: '', code: '', type: 'FINISHED_GOOD', uomId: '', barcode: '', description: '',
      sellingPrice: undefined, minStock: '', maxStock: '', reorderLevel: '', isActive: true,
    },
  })

  // Reset once both the product AND the UOM dropdown options are loaded.
  // Radix <Select> only renders a value whose matching <SelectItem> is already
  // mounted, so resetting before the options exist leaves Type/UOM blank.
  useEffect(() => {
    if (product && !uomsLoading) {
      reset({
        name: product.name,
        code: product.code,
        barcode: product.barcode ?? '',
        description: product.description ?? '',
        type: product.type as any,
        uomId: product.uomId || product.uom?.id || '',
        sellingPrice: product.sellingPrice != null ? Number(product.sellingPrice) : undefined,
        // Show EMPTY (not 0) when the stored value is null/undefined — #5.
        reorderLevel: product.reorderLevel != null ? String(product.reorderLevel) : '',
        minStock: product.minStock != null ? String(product.minStock) : '',
        maxStock: product.maxStock != null ? String(product.maxStock) : '',
        isActive: product.isActive,
      })
      setImages(product.images?.length ? product.images : [])
      setAttributes(product.attributes?.length
        ? product.attributes.map(a => ({ name: a.name, value: a.value, unit: a.unit ?? '' }))
        : [])
      setPrefilled(true)
    }
  }, [product, uomsLoading, reset])

  const onSubmit = async (data: ProductFormData) => {
    try {
      if (!data.uomId) {
        toast.error('Please select a Unit of Measure')
        return
      }
      if (!data.type) {
        toast.error('Please select a product type')
        return
      }
      const trimmedDescription = data.description?.trim()
      const trimmedBarcode = data.barcode?.trim()

      // Clearable stock fields are strings — convert on submit. When cleared, send
      // explicit `null` so the removal persists (and shows EMPTY on reopen) — #5.
      const parseCleared = (v?: string): number | null =>
        v === undefined || v.trim() === '' ? null : Number(v)
      const minStockNum = parseCleared(data.minStock)
      const maxStockNum = parseCleared(data.maxStock)
      const reorderLevelNum = data.reorderLevel === undefined ? NaN : Number(data.reorderLevel)

      // Reorder level is required and must be > 0 — #7/#10.
      if (data.reorderLevel === undefined || data.reorderLevel.trim() === '' || !(reorderLevelNum > 0)) {
        toast.error('Reorder level is required and must be greater than 0')
        return
      }

      // Min stock cannot exceed max stock — #11.
      if (minStockNum != null && maxStockNum != null && minStockNum > maxStockNum) {
        toast.error('Min stock cannot be greater than max stock')
        return
      }

      // Invalid image URLs are rejected before submit — #12.
      const cleanImages = images.map(u => u.trim()).filter(u => u !== '')
      const invalidImage = cleanImages.find(u => !isValidUrl(u))
      if (invalidImage) {
        toast.error(`Invalid image URL: ${invalidImage}`)
        return
      }

      await updateMutation.mutateAsync({
        id,
        data: {
          name: data.name.trim(),
          code: data.code.trim(),
          type: data.type,
          uomId: data.uomId,
          barcode: trimmedBarcode ? trimmedBarcode : null,
          description: trimmedDescription ? trimmedDescription : null,
          // Selling Price is optional. When cleared, send explicit `null` (not
          // undefined) so the backend PATCH persists the removal instead of
          // leaving the stale value — #11.
          sellingPrice: data.sellingPrice != null && !isNaN(data.sellingPrice)
            ? data.sellingPrice
            : null,
          reorderLevel: reorderLevelNum,
          minStock: minStockNum,
          maxStock: maxStockNum,
          images: cleanImages,
          attributes: attributes.filter(a => a.name && a.value).map(a => ({
            name: a.name,
            value: a.value,
            unit: a.unit || undefined,
          })),
          isActive: data.isActive,
        },
      })
      // After saving, return to the product LIST (not the details screen) — #15.
      router.push('/dashboard/products')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update product')
    }
  }

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>
  if (!product) return <div className="p-8 text-muted-foreground">Product not found</div>

  const isSubmitting = updateMutation.isPending

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Edit Product</h2>
          <p className="text-muted-foreground font-mono text-sm">{product.code}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-2xl">
        {/* Basic Info */}
        <Card>
          <CardHeader><CardTitle>Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                {...register('name', {
                  required: 'Name is required',
                  validate: v => v.trim().length > 0 || 'Name is required',
                })}
                placeholder="e.g. Steel Sheet 2mm"
                className="mt-1.5"
              />
              {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Code <span className="text-destructive">*</span></Label>
                <Input
                  {...register('code', {
                    required: 'Code is required',
                    validate: v => v.trim().length > 0 || 'Code is required',
                  })}
                  placeholder="e.g. SS-2MM"
                  className="mt-1.5"
                />
                {errors.code && <p className="text-sm text-destructive mt-1">{errors.code.message}</p>}
              </div>
              <div>
                <Label>Barcode</Label>
                <Input
                  {...register('barcode')}
                  placeholder="Scan or enter barcode"
                  className="mt-1.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type <span className="text-destructive">*</span></Label>
                <Controller
                  control={control}
                  name="type"
                  render={({ field }) => (
                    <Select key={prefilled ? 'ready' : 'init'} value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select product type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FINISHED_GOOD">Finished Good</SelectItem>
                        <SelectItem value="SEMI_FINISHED">Semi-Finished</SelectItem>
                        <SelectItem value="CONSUMABLE">Consumable</SelectItem>
                        <SelectItem value="SERVICE">Service</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label>Unit of Measure <span className="text-destructive">*</span></Label>
                <Controller
                  control={control}
                  name="uomId"
                  render={({ field }) => (
                    <Select key={prefilled ? 'ready' : 'init'} value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder="Select UOM" />
                      </SelectTrigger>
                      <SelectContent>
                        {(uoms as any[]).map((u: any) => (
                          <SelectItem key={u.id} value={u.id}>{u.name} ({u.symbol})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea {...register('description')} rows={3} placeholder="Optional description" className="mt-1.5" />
            </div>

            <div>
              <Label>Selling Price</Label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                {...register('sellingPrice', {
                  valueAsNumber: true,
                  // Optional, but must be > 0 when provided — #9.
                  validate: v =>
                    v === undefined || v === null || isNaN(v as number) || (v as number) > 0 ||
                    'Selling price must be greater than 0',
                })}
                placeholder="0.00"
                className="mt-1.5"
              />
              {errors.sellingPrice && (
                <p className="text-sm text-destructive mt-1">{errors.sellingPrice.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stock Settings */}
        <Card>
          <CardHeader><CardTitle>Stock Settings</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-3 gap-4">
            <div>
              <Label>Reorder Level <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min={1}
                placeholder="e.g. 20"
                {...register('reorderLevel', {
                  required: 'Reorder level is required',
                  validate: v =>
                    (v !== undefined && v.trim() !== '' && Number(v) > 0) ||
                    'Reorder level must be greater than 0',
                })}
                className="mt-1.5"
              />
              {errors.reorderLevel && (
                <p className="text-sm text-destructive mt-1">{errors.reorderLevel.message}</p>
              )}
            </div>
            <div>
              <Label>Min Stock</Label>
              <Input type="number" min={0} placeholder="—" {...register('minStock')} className="mt-1.5" />
            </div>
            <div>
              <Label>Max Stock (opt.)</Label>
              <Input type="number" min={0} placeholder="—" {...register('maxStock')} className="mt-1.5" />
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Images</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={() => setImages(imgs => [...imgs, ''])}>
                <Plus className="h-4 w-4 mr-1" /> Add Image URL
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {images.length === 0 && <p className="text-sm text-muted-foreground">No images added</p>}
            {images.map((url, i) => (
              <div key={i} className="flex gap-2">
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={url}
                  onChange={e => setImages(imgs => imgs.map((v, j) => j === i ? e.target.value : v))}
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => setImages(imgs => imgs.filter((_, j) => j !== i))}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Attributes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Attributes</CardTitle>
              <Button type="button" variant="outline" size="sm"
                onClick={() => setAttributes(attrs => [...attrs, { name: '', value: '', unit: '' }])}>
                <Plus className="h-4 w-4 mr-1" /> Add Attribute
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {attributes.length === 0 && <p className="text-sm text-muted-foreground">No attributes added</p>}
            {attributes.map((attr, i) => (
              <div key={i} className="grid grid-cols-3 gap-2 items-end">
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input
                    placeholder="e.g. Color"
                    value={attr.name}
                    onChange={e => setAttributes(attrs => attrs.map((a, j) => j === i ? { ...a, name: e.target.value } : a))}
                  />
                </div>
                <div>
                  <Label className="text-xs">Value</Label>
                  <Input
                    placeholder="e.g. Red"
                    value={attr.value}
                    onChange={e => setAttributes(attrs => attrs.map((a, j) => j === i ? { ...a, value: e.target.value } : a))}
                  />
                </div>
                <div className="flex gap-1">
                  <div className="flex-1">
                    <Label className="text-xs">Unit (opt.)</Label>
                    <Input
                      placeholder="e.g. mm"
                      value={attr.unit}
                      onChange={e => setAttributes(attrs => attrs.map((a, j) => j === i ? { ...a, unit: e.target.value } : a))}
                    />
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="self-end"
                    onClick={() => setAttributes(attrs => attrs.filter((_, j) => j !== i))}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Active toggle */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Active</p>
                <p className="text-sm text-muted-foreground">Product is available for sale and production</p>
              </div>
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <Switch checked={field.value ?? true} onCheckedChange={field.onChange} />
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700 text-white">
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
