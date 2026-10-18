'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useCreateProduct } from '@/hooks/useProducts'
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
  // of showing/snapping back to 0 — #16. Converted to numbers on submit.
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

export default function AddProductPage() {
  const router = useRouter()
  const createMutation = useCreateProduct()
  const { data: uoms = [], isLoading: uomsLoading } = useUOMsDropdown()

  // Start with no image rows so an empty default URL field isn't shown (#11).
  // Use the "Add Image URL" button to add a row when needed.
  const [images, setImages] = useState<string[]>([])
  const [attributes, setAttributes] = useState<{ name: string; value: string; unit?: string }[]>([])

  const { register, handleSubmit, control, setValue, watch, formState: { errors } } = useForm<ProductFormData>({
    defaultValues: {
      name: '',
      code: '',
      barcode: '',
      description: '',
      reorderLevel: '',
      minStock: '',
      maxStock: '',
      isActive: true,
    },
  })

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

      // Clearable number fields are strings — convert on submit. Reorder level is
      // required and must be > 0 (validated below); min/max stock are omitted when
      // left blank; max stock is omitted when blank — #16/#17.
      const reorderLevelNum = Number(data.reorderLevel)
      const minStockNum =
        data.minStock === undefined || data.minStock.trim() === '' ? undefined : Number(data.minStock)
      const maxStockNum =
        data.maxStock === undefined || data.maxStock.trim() === '' ? undefined : Number(data.maxStock)

      // Min stock cannot exceed max stock — #11.
      if (minStockNum !== undefined && maxStockNum !== undefined && minStockNum > maxStockNum) {
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

      await createMutation.mutateAsync({
        name: data.name.trim(),
        code: data.code.trim(),
        type: data.type,
        uomId: data.uomId,
        barcode: data.barcode || undefined,
        description: data.description || undefined,
        sellingPrice: data.sellingPrice || undefined,
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
      })
      router.push('/dashboard/products')
    } catch (error: any) {
      console.error('Error creating product:', error)
    }
  }

  const isLoading = createMutation.isPending

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Add Product</h2>
          <p className="text-muted-foreground">Create a new product in the catalogue.</p>
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
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
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
                    <Select
                      value={!uomsLoading ? (field.value || undefined) : undefined}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger className="mt-1.5">
                        <SelectValue placeholder={uomsLoading ? 'Loading…' : 'Select UOM'} />
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
              <Input type="number" min={0} placeholder="0" {...register('minStock')} className="mt-1.5" />
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
              <Switch checked={watch('isActive')} onCheckedChange={val => setValue('isActive', val)} />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white">
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Product
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
