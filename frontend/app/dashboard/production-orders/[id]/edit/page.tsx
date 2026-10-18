'use client'

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ArrowLeft, Factory, Loader2 } from 'lucide-react'
import { useSitesDropdown } from '@/hooks/useSites'
import { useProductionOrder, useUpdateProductionOrder } from '@/hooks/useProductionOrders'

interface FormData {
  siteId: string
  notes: string
}

export default function EditProductionOrderPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: order, isLoading, error } = useProductionOrder(id)
  const updateMutation = useUpdateProductionOrder()
  const { data: sites = [] } = useSitesDropdown()

  const { handleSubmit, control, register, reset } = useForm<FormData>({
    defaultValues: { siteId: '', notes: '' },
  })

  // Reset the form once the order loads. Depend only on `order` (and the stable
  // `reset`) — `sites` defaults to a fresh [] each render while its query is
  // pending, which in the deps caused a re-render loop. The key-remounted Select
  // below resolves the saved siteId against its options on its own.
  useEffect(() => {
    if (order) reset({ siteId: order.siteId || '', notes: order.notes || '' })
  }, [order, reset])

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
  // Guard on the query error too (mirrors the detail page) so a failed/empty
  // fetch shows a graceful message instead of throwing into the error boundary
  // ("Something went wrong") after a hard refresh or logout-login (#37).
  if (error || !order) return <div className="p-8 text-muted-foreground">Production order not found.</div>

  const isDraft = order.status === 'DRAFT'

  const onSubmit = async (data: FormData) => {
    try {
      await updateMutation.mutateAsync({ id, data: { siteId: data.siteId || undefined, notes: data.notes || undefined } })
      toast.success('Production order updated')
      router.push(`/dashboard/production-orders/${id}`)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update production order')
    }
  }

  return (
    <ProtectedRoute>
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Factory className="h-8 w-8 text-green-600" /> Edit Production Order
            </h1>
            <p className="text-gray-600 mt-1 font-mono text-sm">{order.orderNumber}</p>
          </div>
        </div>

        {!isDraft && (
          <Alert>
            <AlertDescription>
              Only <strong>DRAFT</strong> production orders can be edited. This order is <strong>{order.status?.replace('_', ' ')}</strong>.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <fieldset disabled={!isDraft} className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Editable Fields</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Site</Label>
                  <Controller
                    control={control}
                    name="siteId"
                    render={({ field }) => (
                      <Select key={field.value || 'k'} value={field.value || 'none'} onValueChange={v => field.onChange(v === 'none' ? '' : v)}>
                        <SelectTrigger><SelectValue placeholder="Select site" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">— No site —</SelectItem>
                          {/* Guard the dropdown: an unexpected-shape entry with an empty id makes
                              Radix <SelectItem value=""> throw on a cold load (no warm cache),
                              which crashes the whole page into the error boundary (#24). */}
                          {(Array.isArray(sites) ? sites : [])
                            .filter((s: any) => s && s.id)
                            .map((s: any) => (
                              <SelectItem key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea {...register('notes')} rows={3} placeholder="Optional notes…" />
                </div>
              </CardContent>
            </Card>
          </fieldset>

          <div className="flex gap-3">
            <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white" disabled={!isDraft || updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Save Changes
            </Button>
            <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
