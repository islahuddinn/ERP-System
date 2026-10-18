'use client'

import { useParams, useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { useEffect } from 'react'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useRawMaterial, useUpdateRawMaterial } from '@/hooks/useRawMaterials'
import { useUOMsDropdown } from '@/hooks/useMasterData'

interface RawMaterialFormData {
  name: string
  code: string
  uomId: string
  description?: string
  reorderLevel?: number
  // Kept as a string so the field can be fully cleared (empty input) instead of
  // snapping back to 0; converted to a number / null on submit — #7.
  lastPurchasePrice?: string
}

export default function EditRawMaterialPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: rm, isLoading } = useRawMaterial(id)
  const updateMutation = useUpdateRawMaterial()
  const { data: uoms = [], isLoading: uomsLoading } = useUOMsDropdown()

  const { register, handleSubmit, control, setValue, reset, formState: { errors } } = useForm<RawMaterialFormData>({
    defaultValues: {
      name: '', code: '', uomId: '', description: '', reorderLevel: 0,
      lastPurchasePrice: '',
    },
  })

  useEffect(() => {
    if (rm && !uomsLoading) {
      // Reset from freshly-fetched data so cleared optional fields reflect the
      // persisted state (empty stays empty on re-edit) — #5/#7.
      // Guard on !uomsLoading so the UOM <Select> can match its value once
      // options are present (fixes the dropdown showing placeholder on load).
      // A null/undefined/0 lastPurchasePrice renders as an empty input (an
      // unset price is not a meaningful 0) — #7.
      const priceNum = Number(rm.lastPurchasePrice)
      const price =
        rm.lastPurchasePrice === null ||
        rm.lastPurchasePrice === undefined ||
        rm.lastPurchasePrice === '' ||
        Number.isNaN(priceNum) ||
        priceNum === 0
          ? ''
          : String(priceNum)
      reset({
        name: rm.name,
        code: rm.code,
        uomId: rm.uomId,
        description: rm.description ?? '',
        reorderLevel: rm.reorderLevel,
        lastPurchasePrice: price,
      })
    }
  }, [rm, uomsLoading, reset])

  const onSubmit = async (data: RawMaterialFormData) => {
    const trimmedDescription = data.description?.trim()
    // Last price is held as a string; an empty/blank input means "no price" and
    // is sent as null (not coerced to 0) so it persists empty on re-edit — #7.
    const rawPrice = (data.lastPurchasePrice ?? '').toString().trim()
    const priceNum = rawPrice === '' ? null : Number(rawPrice)
    await updateMutation.mutateAsync({
      id,
      data: {
        name: data.name.trim(),
        code: data.code.trim(),
        uomId: data.uomId,
        // Emptied optional fields must be sent explicitly so they persist empty
        // on re-edit — #5/#7. `description` is nullable → send null to clear it.
        description: trimmedDescription ? trimmedDescription : null,
        reorderLevel: data.reorderLevel,
        lastPurchasePrice: priceNum === null || Number.isNaN(priceNum) ? null : priceNum,
      },
    })
    // After a successful edit, go back to the LIST (not the details screen) — #4.
    router.push('/dashboard/raw-materials')
  }

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header — mirrors detail page */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">{rm?.name ?? 'Edit Raw Material'}</h2>
          <p className="text-muted-foreground font-mono text-sm">{rm?.code}</p>
        </div>
        {/* Submit lives in the form footer next to Cancel — header duplicate removed (#5). */}
      </div>

      <form id="rm-edit-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                  className="mt-1.5 font-mono"
                  onChange={e => setValue('code', e.target.value.toUpperCase().replace(/\s+/g, '-'))}
                />
                <p className="text-xs text-muted-foreground mt-1">Uppercase, spaces become hyphens</p>
                {errors.code && <p className="text-sm text-destructive mt-1">{errors.code.message}</p>}
              </div>

              <div>
                <Label>Unit of Measure <span className="text-destructive">*</span></Label>
                <Controller
                  control={control}
                  name="uomId"
                  rules={{ required: true }}
                  render={({ field }) => (
                    <Select key={field.value || 'k'} value={field.value || undefined} onValueChange={field.onChange}>
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

              <div>
                <Label>Description</Label>
                <Textarea
                  {...register('description')}
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
                  {...register('lastPurchasePrice')}
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
            disabled={updateMutation.isPending}
          >
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
