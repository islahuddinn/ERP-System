'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useCreateRawMaterial } from '@/hooks/useRawMaterials'
import { useUOMsDropdown } from '@/hooks/useMasterData'

interface RawMaterialFormData {
  name: string
  code: string
  uomId: string
  description?: string
  currentStock?: number
  reorderLevel?: number
  lastPurchasePrice?: number
}

export default function AddRawMaterialPage() {
  const router = useRouter()
  const createMutation = useCreateRawMaterial()
  const { data: uoms = [] } = useUOMsDropdown()

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<RawMaterialFormData>({
    defaultValues: { currentStock: 0, reorderLevel: undefined, uomId: '' },
  })

  // Register uomId so RHF validates it on submit (the field is driven by a
  // controlled <Select>, not a native input) — #28.
  register('uomId', { required: 'Unit of measure is required' })

  const onSubmit = async (data: RawMaterialFormData) => {
    try {
      await createMutation.mutateAsync({
        name: data.name.trim(),
        code: data.code.trim(),
        uomId: data.uomId,
        description: data.description || undefined,
        currentStock: data.currentStock ?? 0,
        reorderLevel: data.reorderLevel ?? 0,
        lastPurchasePrice: data.lastPurchasePrice || undefined,
      })
      router.push('/dashboard/raw-materials')
    } catch {
      // The mutation's onError already surfaces the API validation message via
      // getApiErrorMessage; swallow here so we don't navigate away and don't
      // raise an unhandled rejection. — QA #6
    }
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header — mirrors detail page */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Add Raw Material</h2>
          <p className="text-muted-foreground text-sm">New material entry</p>
        </div>
        {/* Submit lives in the form footer next to Cancel — header duplicate removed (#3). */}
      </div>

      <form id="rm-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Two-column layout matching detail page */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Details card */}
          <Card>
            <CardHeader><CardTitle>Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Name <span className="text-destructive">*</span></Label>
                <Input
                  {...register('name', {
                    required: 'Name is required',
                    validate: v => v.trim() !== '' || 'Name is required',
                  })}
                  placeholder="e.g. Sunflower Oil"
                  className="mt-1.5"
                />
                {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <Label>Code <span className="text-destructive">*</span></Label>
                <Input
                  {...register('code', {
                    required: 'Code is required',
                    validate: v => /[A-Z0-9]/.test(v.trim()) || 'Code is required',
                  })}
                  placeholder="e.g. SUNFLOWER-OIL"
                  className="mt-1.5 font-mono"
                  onChange={e => setValue('code', e.target.value.toUpperCase().replace(/\s+/g, '-'))}
                />
                <p className="text-xs text-muted-foreground mt-1">Uppercase, spaces become hyphens</p>
                {errors.code && <p className="text-sm text-destructive mt-1">{errors.code.message}</p>}
              </div>

              <div>
                <Label>Unit of Measure <span className="text-destructive">*</span></Label>
                <Select
                  value={watch('uomId')}
                  onValueChange={val => setValue('uomId', val, { shouldValidate: true })}
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="Select UOM" />
                  </SelectTrigger>
                  <SelectContent>
                    {(uoms as any[]).map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>{u.name} ({u.symbol})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.uomId && <p className="text-sm text-destructive mt-1">{errors.uomId.message}</p>}
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  {...register('description')}
                  placeholder="Optional description"
                  rows={3}
                  className="mt-1.5"
                />
              </div>

              <div>
                <Label>Last Purchase Price</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  {...register('lastPurchasePrice', { valueAsNumber: true })}
                  className="mt-1.5"
                />
              </div>
            </CardContent>
          </Card>

          {/* Reorder card — stock itself is computed from GRN receipts on the backend. */}
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>Reorder Level</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Reorder Level <span className="text-destructive">*</span></Label>
                  <Input
                    type="number"
                    min={1}
                    step="0.001"
                    placeholder="e.g. 50"
                    {...register('reorderLevel', {
                      valueAsNumber: true,
                      required: 'Reorder level is required',
                      min: { value: 1, message: 'Reorder level must be greater than 0' },
                    })}
                    className="mt-1.5"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Alert when stock falls below this</p>
                  {errors.reorderLevel && (
                    <p className="text-sm text-destructive mt-1">{errors.reorderLevel.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            type="submit"
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={createMutation.isPending}
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Raw Material
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
