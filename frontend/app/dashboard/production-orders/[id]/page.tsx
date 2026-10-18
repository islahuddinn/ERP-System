'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useConfirm } from '@/components/ui/confirm-provider'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import { ArrowLeft, Factory, Loader2, Edit, CheckCircle, XCircle, Plus } from 'lucide-react'
import {
  useProductionOrder, useConfirmProductionOrder, useCompleteProductionOrder,
  useCancelProductionOrder, useAddProductionCost, useAddProductionWaste,
  type ProductionCostType,
} from '@/hooks/useProductionOrders'
import { useWasteManagement } from '@/hooks/useWasteManagement'
import { useSitesDropdown } from '@/hooks/useSites'
import { formatCurrency } from '@/lib/currency'

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}
const money = (v: unknown) => formatCurrency(Number(v ?? 0))
// Round a quantity to 2 decimals and drop trailing zeros (fixes 87.75999999999999 → 87.76) (#30)
const qty = (v: unknown) => Number(Number(v ?? 0).toFixed(2))

export default function ProductionOrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const confirm = useConfirm()
  const { data: order, isLoading, error } = useProductionOrder(id)

  const confirmMutation = useConfirmProductionOrder()
  const completeMutation = useCompleteProductionOrder()
  const cancelMutation = useCancelProductionOrder()
  const addCostMutation = useAddProductionCost()
  const addWasteMutation = useAddProductionWaste()

  const [completeOpen, setCompleteOpen] = useState(false)
  const [producedQty, setProducedQty] = useState('')
  const [completeSiteId, setCompleteSiteId] = useState('')
  const [costOpen, setCostOpen] = useState(false)
  const [costType, setCostType] = useState<ProductionCostType>('LABOUR')
  const [costDesc, setCostDesc] = useState('')
  const [costAmount, setCostAmount] = useState('')
  const [wasteOpen, setWasteOpen] = useState(false)
  const [wasteId, setWasteId] = useState('')
  const [wasteQty, setWasteQty] = useState('')
  const [wasteUnitCost, setWasteUnitCost] = useState('')
  const [wasteTotalCost, setWasteTotalCost] = useState('')
  const [wasteNotes, setWasteNotes] = useState('')

  // Pending raw-material waste records, for the "waste-as-input" dropdown
  const { data: wasteData } = useWasteManagement({ status: 'PENDING', itemType: 'RAW_MATERIAL', limit: 100 } as any)
  const wasteRecords: any[] = Array.isArray(wasteData) ? wasteData : (wasteData?.data ?? [])
  const { data: sites = [] } = useSitesDropdown()

  // Reset-and-open helpers so popups never retain stale values (#34, #36)
  const openCostDialog = () => { setCostType('LABOUR'); setCostDesc(''); setCostAmount(''); setCostOpen(true) }
  const openWasteDialog = () => { setWasteId(''); setWasteQty(''); setWasteUnitCost(''); setWasteTotalCost(''); setWasteNotes(''); setWasteOpen(true) }

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
  if (error || !order) return <div className="p-8 text-muted-foreground">Production order not found.</div>

  const isDraft = order.status === 'DRAFT'
  const isInProgress = order.status === 'IN_PROGRESS'
  const isCancelled = order.status === 'CANCELLED'
  // Costs and waste inputs may only be added while the order is still being
  // produced. Once COMPLETE (or CANCELLED/DRAFT) the buttons are hidden (#35).
  const canModifyCostWaste = isInProgress

  // Complete dialog validation: producedQuantity is the only body field the
  // status endpoint *requires* (for action=COMPLETE). It must be > 0 and cannot
  // exceed the planned quantity, matching the backend's service-level checks.
  const producedNum = parseFloat(producedQty)
  const producedExceeds = !Number.isNaN(producedNum) && producedNum > order.plannedQuantity
  const producedValid = !Number.isNaN(producedNum) && producedNum > 0 && !producedExceeds

  const handleConfirm = async () => {
    if (!(await confirm({ title: 'Confirm Production Order', description: 'This consumes the reserved raw-material stock and moves the order to IN PROGRESS. Continue?', confirmLabel: 'Confirm', confirmVariant: 'default' }))) return
    try { await confirmMutation.mutateAsync(id); toast.success('Production order confirmed') }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to confirm') }
  }

  const handleCancel = async () => {
    if (!(await confirm({ title: 'Cancel Production Order', description: 'Cancelling restores consumed/reserved stock. This cannot be undone. Continue?', confirmLabel: 'Cancel Order' }))) return
    try { await cancelMutation.mutateAsync(id); toast.success('Production order cancelled') }
    catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to cancel') }
  }

  const handleComplete = async () => {
    const produced = parseFloat(producedQty)
    if (Number.isNaN(produced) || produced <= 0) { toast.error('Enter a valid produced quantity'); return }
    if (produced > order.plannedQuantity) { toast.error(`Produced quantity cannot exceed planned quantity (${qty(order.plannedQuantity)})`); return }
    try {
      await completeMutation.mutateAsync({ id, producedQuantity: produced, siteId: completeSiteId || undefined })
      toast.success('Production order completed')
      setCompleteOpen(false)
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to complete') }
  }

  const handleAddCost = async () => {
    const amount = parseFloat(costAmount)
    if (!amount || amount <= 0) { toast.error('Amount must be greater than 0'); return }
    try {
      await addCostMutation.mutateAsync({ id, data: { costType, description: costDesc || undefined, amount } })
      toast.success('Cost added'); setCostOpen(false)
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to add cost') }
  }

  const handleAddWaste = async () => {
    const wQty = parseFloat(wasteQty); const unit = parseFloat(wasteUnitCost)
    if (!wasteId) { toast.error('Select a waste record'); return }
    if (!wQty || wQty <= 0) { toast.error('Quantity must be greater than 0'); return }
    if (Number.isNaN(unit) || unit < 0) { toast.error('Enter a valid unit cost'); return }
    // Total cost defaults to qty × unit cost, but the user may override it (#35)
    const total = wasteTotalCost !== '' ? parseFloat(wasteTotalCost) : wQty * unit
    if (Number.isNaN(total) || total < 0) { toast.error('Enter a valid total cost'); return }
    try {
      await addWasteMutation.mutateAsync({ id, data: { wasteManagementId: wasteId, quantity: wQty, unitCost: unit, totalCost: total, notes: wasteNotes || undefined } })
      toast.success('Waste input added'); setWasteOpen(false)
    } catch (e: any) { toast.error(e?.response?.data?.message || 'Failed to add waste') }
  }

  return (
    <ProtectedRoute>
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Factory className="h-8 w-8 text-green-600" /> {order.orderNumber}
            </h1>
            <p className="text-gray-600 mt-1">{order.product?.name} · {order.bom?.bomNumber ?? 'No BOM'} · {order.site?.name ?? 'No site'}</p>
          </div>
          <Badge className={`text-sm font-medium ${STATUS_STYLES[order.status] ?? 'bg-gray-100 text-gray-700'}`}>{order.status.replace('_', ' ')}</Badge>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {isDraft && (
            <>
              <Button onClick={handleConfirm} disabled={confirmMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                <CheckCircle className="h-4 w-4 mr-2" /> Confirm (start production)
              </Button>
              <Button variant="outline" onClick={() => router.push(`/dashboard/production-orders/${id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" /> Edit
              </Button>
            </>
          )}
          {isInProgress && (
            <Button onClick={() => { setProducedQty(''); setCompleteSiteId(order.siteId ?? ''); setCompleteOpen(true) }} className="bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle className="h-4 w-4 mr-2" /> Complete
            </Button>
          )}
          {canModifyCostWaste && (
            <>
              <Button variant="outline" onClick={openCostDialog}><Plus className="h-4 w-4 mr-2" /> Add Cost</Button>
              <Button variant="outline" onClick={openWasteDialog}><Plus className="h-4 w-4 mr-2" /> Add Waste Input</Button>
            </>
          )}
          {(isDraft || isInProgress) && (
            <Button variant="outline" onClick={handleCancel} disabled={cancelMutation.isPending} className="border-red-300 text-red-700 hover:bg-red-50">
              <XCircle className="h-4 w-4 mr-2" /> Cancel
            </Button>
          )}
          <ViewHistoryButton entityName="ProductionOrder" entityId={order.id} size="default" />
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Planned</p><p className="text-2xl font-bold">{qty(order.plannedQuantity)}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Produced</p><p className="text-2xl font-bold">{qty(order.producedQuantity)}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Total Cost</p><p className="text-2xl font-bold">{money(order.totalCost)}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Cost / Unit</p><p className="text-2xl font-bold">{order.costPerUnit ? money(order.costPerUnit) : '—'}</p></CardContent></Card>
        </div>

        {/* Cost breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-base">Cost Breakdown</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-gray-500">Raw Material</p><p className="font-semibold">{money(order.rawMaterialCost)}</p></div>
              <div><p className="text-gray-500">Additional</p><p className="font-semibold">{money(order.additionalCost)}</p></div>
              <div><p className="text-gray-500">Waste Input</p><p className="font-semibold">{money(order.wasteInputCost)}</p></div>
              <div><p className="text-gray-500">Total</p><p className="font-semibold text-green-700">{money(order.totalCost)}</p></div>
            </div>
          </CardContent>
        </Card>

        {/* Materials (FIFO) */}
        <Card>
          <CardHeader><CardTitle className="text-base">Materials & FIFO Batch Allocation</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Raw Material</TableHead>
                  <TableHead className="text-right">Required</TableHead>
                  <TableHead className="text-right">Consumed</TableHead>
                  <TableHead>Batches (FIFO)</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(order.materials ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-gray-500">No materials</TableCell></TableRow>
                ) : (order.materials ?? []).map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.rawMaterial?.name ?? '—'}<span className="text-xs text-gray-400 ml-1">{m.uom?.symbol}</span></TableCell>
                    <TableCell className="text-right">{qty(m.requiredQuantity)}</TableCell>
                    <TableCell className="text-right">{qty(m.consumedQuantity)}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {(m.batchAllocations ?? []).map(b => (
                          <span key={b.id} className="text-xs text-gray-600">
                            {b.rawMaterialBatch?.batchNumber ?? b.rawMaterialBatchId.slice(0, 8)} · {qty(b.allocatedQuantity)} @ {money(b.unitCost)}{b.consumedAt ? '' : ' (reserved)'}
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">{money(m.actualCost ?? m.estimatedCost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Costs */}
        <Card>
          <CardHeader><CardTitle className="text-base">Additional Costs</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow className="bg-gray-50"><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {(order.costs ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={3} className="text-center py-6 text-gray-500">No additional costs</TableCell></TableRow>
                ) : (order.costs ?? []).map(c => (
                  <TableRow key={c.id}><TableCell><Badge variant="outline">{c.costType}</Badge></TableCell><TableCell>{c.description || '—'}</TableCell><TableCell className="text-right font-medium">{money(c.amount)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Wastes */}
        <Card>
          <CardHeader><CardTitle className="text-base">Waste Inputs</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader><TableRow className="bg-gray-50"><TableHead>Raw Material</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Unit Cost</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>
                {(order.wastes ?? []).length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-6 text-gray-500">No waste inputs</TableCell></TableRow>
                ) : (order.wastes ?? []).map(w => (
                  <TableRow key={w.id}><TableCell>{w.rawMaterial?.name ?? '—'}</TableCell><TableCell className="text-right">{qty(w.quantity)} {w.uom?.symbol}</TableCell><TableCell className="text-right">{money(w.unitCost)}</TableCell><TableCell className="text-right font-medium">{money(w.totalCost)}</TableCell></TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {order.notes && <Card><CardContent className="pt-6"><p className="text-sm text-gray-500 mb-1">Notes</p><p className="text-gray-800">{order.notes}</p></CardContent></Card>}
      </div>

      {/* Complete dialog */}
      <Dialog open={completeOpen} onOpenChange={setCompleteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Complete Production Order</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Produced Quantity <span className="text-red-500">*</span></Label>
              <Input type="number" min="0.01" step="0.01" max={order.plannedQuantity} placeholder="Enter actual produced quantity" value={producedQty} onChange={e => setProducedQty(e.target.value)} />
              {producedExceeds
                ? <p className="text-xs text-red-500">Cannot exceed planned quantity ({qty(order.plannedQuantity)}).</p>
                : <p className="text-xs text-gray-500">Cost per unit = total cost ÷ produced quantity. Max {qty(order.plannedQuantity)} (planned).</p>}
            </div>
            <div className="space-y-2">
              <Label>Site <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Select value={completeSiteId || undefined} onValueChange={v => setCompleteSiteId(v === 'none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select Site" /></SelectTrigger>
                <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                  <SelectItem value="none">— Order&apos;s site —</SelectItem>
                  {(sites as any[]).map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">Where the produced batch is located. Defaults to the order&apos;s site.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteOpen(false)}>Cancel</Button>
            <Button onClick={handleComplete} disabled={completeMutation.isPending || !producedValid} className="bg-green-600 hover:bg-green-700 text-white">
              {completeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Complete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add cost dialog */}
      <Dialog open={costOpen} onOpenChange={setCostOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Cost Line</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Cost Type <span className="text-red-500">*</span></Label>
              <Select value={costType} onValueChange={v => setCostType(v as ProductionCostType)}>
                <SelectTrigger><SelectValue placeholder="Select cost type" /></SelectTrigger>
                <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                  <SelectItem value="LABOUR">Labour</SelectItem>
                  <SelectItem value="OVERHEAD">Overhead</SelectItem>
                  <SelectItem value="UTILITY">Utility</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Description</Label><Input value={costDesc} onChange={e => setCostDesc(e.target.value)} placeholder="e.g. Electricity" /></div>
            <div className="space-y-2"><Label>Amount</Label><Input type="number" min="0.01" step="0.01" value={costAmount} onChange={e => setCostAmount(e.target.value)} placeholder="0.00" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCostOpen(false)}>Cancel</Button>
            <Button onClick={handleAddCost} disabled={addCostMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
              {addCostMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Add Cost
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add waste dialog */}
      <Dialog open={wasteOpen} onOpenChange={setWasteOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add Waste-as-Input</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label>Pending Waste Record (raw material) <span className="text-red-500">*</span></Label>
              <Select value={wasteId || undefined} onValueChange={setWasteId}>
                <SelectTrigger>
                  {/* No custom children on <SelectValue>: Radix renders the selected
                      item's own text automatically. Conditional children here toggled
                      a text node in/out and caused a React/Radix DOM mismatch
                      ("Failed to execute 'removeChild'"). */}
                  <SelectValue placeholder="Select a pending waste record" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                  {wasteRecords.length === 0 ? (
                    <div className="px-2 py-1.5 text-sm text-gray-500">No pending raw-material waste records</div>
                  ) : wasteRecords.map((w: any) => (
                    <SelectItem key={w.id} value={w.id}>
                      {(w.rawMaterial?.name ?? w.itemName ?? 'Waste')} · {qty(w.quantity)} {w.uom?.symbol ?? ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Quantity <span className="text-red-500">*</span></Label><Input type="number" min="0.01" step="0.01" value={wasteQty} onChange={e => setWasteQty(e.target.value)} /></div>
              <div className="space-y-2"><Label>Unit Cost <span className="text-red-500">*</span></Label><Input type="number" min="0" step="0.01" value={wasteUnitCost} onChange={e => setWasteUnitCost(e.target.value)} /></div>
            </div>
            <div className="space-y-2">
              <Label>Total Cost</Label>
              <Input type="number" min="0" step="0.01" value={wasteTotalCost}
                placeholder={String((parseFloat(wasteQty) || 0) * (parseFloat(wasteUnitCost) || 0))}
                onChange={e => setWasteTotalCost(e.target.value)} />
              <p className="text-xs text-gray-500">Leave blank to use Quantity × Unit Cost = {money((parseFloat(wasteQty) || 0) * (parseFloat(wasteUnitCost) || 0))}.</p>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea rows={2} value={wasteNotes} onChange={e => setWasteNotes(e.target.value)} placeholder="Optional notes…" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWasteOpen(false)}>Cancel</Button>
            <Button onClick={handleAddWaste} disabled={addWasteMutation.isPending} className="bg-green-600 hover:bg-green-700 text-white">
              {addWasteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Add Waste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  )
}
