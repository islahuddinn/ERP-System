'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ArrowLeft, Factory, Loader2 } from 'lucide-react'
import { useProductsDropdown } from '@/hooks/useProducts'
import { useSitesDropdown } from '@/hooks/useSites'
import { useBoms } from '@/hooks/useBom'
import { useCreateProductionOrder } from '@/hooks/useProductionOrders'

interface FormData {
  productId: string
  bomId: string
  siteId: string
  plannedQuantity: string
  notes: string
}

export default function CreateProductionOrderPage() {
  const router = useRouter()
  const createMutation = useCreateProductionOrder()
  const { data: productsRaw = [] } = useProductsDropdown()
  const { data: sitesRaw = [] } = useSitesDropdown()

  // Radix <SelectItem> throws (blanking the whole screen) if a value is an empty
  // string, so drop any malformed row without a valid id before rendering.
  // Memoized so the reference is stable across renders — an unstable array here
  // feeds the BOM effect's deps and caused "Maximum update depth exceeded".
  const products = useMemo(() => (productsRaw as any[]).filter((p) => p?.id), [productsRaw])
  // Only active sites are selectable — a site can be INACTIVE/QUARANTINE/etc.
  // The dropdown endpoint returns a `status` field; keep ACTIVE only (and treat a
  // missing status as active so we never hide valid rows). Also drops malformed
  // rows without an id (Radix <SelectItem> throws on an empty value).
  const sites = useMemo(
    () =>
      (sitesRaw as any[]).filter(
        (s) => s?.id && (s.status == null || s.status === 'ACTIVE') && s.isActive !== false,
      ),
    [sitesRaw],
  )

  const { register, handleSubmit, control, watch, setValue } = useForm<FormData>({
    defaultValues: { productId: '', bomId: '', siteId: '', plannedQuantity: '', notes: '' },
  })

  const productId = watch('productId')
  const bomId = watch('bomId')

  // Active BOMs for the selected product — populate the BOM dropdown (#28)
  const { data: bomData, isLoading: bomLoading } = useBoms(
    productId ? { productId, status: 'ACTIVE', limit: 100 } : {},
  )
  // Stable reference (see products/sites above) — this array is a dependency of
  // the auto-select effect below, so a new reference each render would loop.
  const boms: any[] = useMemo(
    () => (productId ? (bomData?.data ?? []).filter((b: any) => b?.id) : []),
    [productId, bomData],
  )

  // Auto-select the BOM when there is exactly one; clear it if the current
  // selection is no longer valid for the chosen product.
  useEffect(() => {
    if (!productId) { setValue('bomId', ''); return }
    if (bomId && !boms.some(b => b.id === bomId)) setValue('bomId', '')
    if (!bomId && boms.length === 1) setValue('bomId', boms[0].id)
  }, [productId, boms, bomId, setValue])

  const onSubmit = async (data: FormData) => {
    if (!data.productId) { toast.error('Select a product'); return }
    if (!data.bomId) { toast.error('Select a Bill of Materials (BOM)'); return }
    const qty = parseFloat(data.plannedQuantity)
    if (!qty || qty <= 0) { toast.error('Planned quantity must be greater than 0'); return }

    try {
      const order = await createMutation.mutateAsync({
        productId: data.productId,
        bomId: data.bomId,
        siteId: data.siteId || undefined,
        plannedQuantity: qty,
        notes: data.notes || undefined,
      })
      toast.success('Production order created')
      router.push(`/dashboard/production-orders/${order.id}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to create production order')
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
              <Factory className="h-8 w-8 text-green-600" /> Create Production Order
            </h1>
            <p className="text-gray-600 mt-1">Raw materials are reserved via FIFO from available batches at creation</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <Card>
            <CardHeader><CardTitle>Order Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Product <span className="text-red-500">*</span></Label>
                <Controller
                  control={control}
                  name="productId"
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger className={!field.value ? 'border-red-300' : ''}>
                        <SelectValue placeholder="Select product to produce" />
                      </SelectTrigger>
                      <SelectContent className="max-h-60 overflow-y-auto">
                        {(products as any[]).map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>{p.name} ({p.code})</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label>Bill of Materials <span className="text-red-500">*</span></Label>
                <Controller
                  control={control}
                  name="bomId"
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select value={field.value || undefined} onValueChange={field.onChange} disabled={!productId}>
                      <SelectTrigger className={productId && !field.value ? 'border-red-300' : ''}>
                        <SelectValue placeholder={productId ? 'Select a BOM' : 'Select a product first'} />
                      </SelectTrigger>
                      <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                        {boms.length === 0 ? (
                          <div className="px-2 py-1.5 text-sm text-gray-500">
                            {bomLoading ? 'Loading BOMs…' : 'No active BOM for this product'}
                          </div>
                        ) : boms.map((b: any) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.bomNumber}{b.name ? ` · ${b.name}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Planned Quantity <span className="text-red-500">*</span></Label>
                  <Input type="number" min="0.01" step="0.01" placeholder="100"
                    {...register('plannedQuantity', { required: true })} />
                </div>
                <div className="space-y-2">
                  <Label>Site <span className="text-gray-400 font-normal">(optional)</span></Label>
                  <Controller
                    control={control}
                    name="siteId"
                    render={({ field }) => (
                      <Select value={field.value || undefined} onValueChange={v => field.onChange(v === 'none' ? '' : v)}>
                        <SelectTrigger><SelectValue placeholder="Select Site" /></SelectTrigger>
                        <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                          <SelectItem value="none">— No site —</SelectItem>
                          {(sites as any[]).map((s: any) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea {...register('notes')} rows={2} placeholder="Optional notes…" />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-3">
            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white"
              disabled={createMutation.isPending || !productId || !bomId}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Production Order
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
