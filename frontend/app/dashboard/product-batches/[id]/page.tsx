'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ArrowLeft, Boxes, CheckCircle2, Loader2, PackageCheck, Pencil, Play, XCircle } from 'lucide-react'
import { toast } from 'react-hot-toast'
import {
  useProductBatch,
  useFinalizeProductBatch,
  useUpdateProductBatch,
  useStartProductBatchStage,
  useCompleteProductBatchStage,
  useCancelProductBatchStage,
  type ProductBatchStage,
  type ProductBatchStatus,
} from '@/hooks/useProductBatches'
import { useSitesDropdown } from '@/hooks/useSites'
import { formatCurrency } from '@/lib/currency'

// Statuses a user may set manually from the Update Batch dialog (QA #45).
const UPDATABLE_STATUSES: ProductBatchStatus[] = ['ACTIVE', 'BLOCKED', 'QUARANTINE']

const errorMessage = (error: any, fallback: string): string =>
  error?.response?.data?.message || error?.message || fallback

const FINALIZABLE_STATUSES = ['ACTIVE', 'PARTIAL']

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  PARTIAL: 'bg-blue-100 text-blue-700',
  CONSUMED: 'bg-gray-100 text-gray-700',
  EXPIRED: 'bg-red-100 text-red-700',
  BLOCKED: 'bg-orange-100 text-orange-700',
  QUARANTINE: 'bg-yellow-100 text-yellow-700',
}

const STAGE_STATUS_STYLES: Record<string, string> = {
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  COMPLETED: 'bg-green-100 text-green-700',
  CANCELLED: 'bg-red-100 text-red-700',
}

const money = (v: unknown) => formatCurrency(Number(v ?? 0))
const qty = (v: unknown) => Number(v ?? 0).toLocaleString('en-US')
const formatDate = (v: string | null | undefined) =>
  v ? new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'

export default function ProductBatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: batch, isLoading, error } = useProductBatch(id)
  const finalize = useFinalizeProductBatch()
  const updateBatch = useUpdateProductBatch()
  const startStage = useStartProductBatchStage()
  const completeStage = useCompleteProductBatchStage()
  const cancelStage = useCancelProductBatchStage()
  const { data: sites = [] } = useSitesDropdown()

  const [finalizeOpen, setFinalizeOpen] = useState(false)
  const [retailPrice, setRetailPrice] = useState('')
  const [salePrice, setSalePrice] = useState('')
  const [manufacturingDate, setManufacturingDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [finalizeNotes, setFinalizeNotes] = useState('')

  // Update batch dialog (QA #45)
  const [updateOpen, setUpdateOpen] = useState(false)
  const [editRetailPrice, setEditRetailPrice] = useState('')
  const [editSalePrice, setEditSalePrice] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [editStatus, setEditStatus] = useState<ProductBatchStatus>('ACTIVE')

  // Start new stage dialog
  const [startOpen, setStartOpen] = useState(false)
  const [stageName, setStageName] = useState('')
  const [startSiteId, setStartSiteId] = useState('')

  // Complete stage dialog
  const [completeStageRow, setCompleteStageRow] = useState<ProductBatchStage | null>(null)
  const [approvedQuantity, setApprovedQuantity] = useState('')
  const [rejectedQuantity, setRejectedQuantity] = useState('')
  const [additionalCost, setAdditionalCost] = useState('')
  const [completeNotes, setCompleteNotes] = useState('')

  // Cancel stage confirm dialog
  const [cancelStageRow, setCancelStageRow] = useState<ProductBatchStage | null>(null)

  if (isLoading) return <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
  if (error || !batch) return <div className="p-8 text-muted-foreground">Product batch not found.</div>

  const stages = batch.stages ?? []
  const hasInProgressStage = stages.some(s => s.status === 'IN_PROGRESS')
  // Finalize requires the current stage to be completed first — finalize no
  // longer auto-completes an in-progress stage (QA #55).
  const canFinalize =
    !batch.isFinal && FINALIZABLE_STATUSES.includes(batch.status) && !hasInProgressStage

  const canStartStage = !batch.isFinal && !hasInProgressStage
  // The most recent stage row (stages are returned in chronological order).
  const latestStage = stages.length > 0 ? stages[stages.length - 1] : null

  // Cancel is allowed on the latest IN_PROGRESS stage — including the initial
  // auto-created "Production" stage (QA #50) — but never once the batch is final.
  const canCancelStage = (stage: ProductBatchStage): boolean =>
    !batch.isFinal &&
    stage.status === 'IN_PROGRESS' &&
    latestStage?.id === stage.id

  // Reset the finalize form every time the dialog is opened (QA #52).
  const openFinalizeDialog = () => {
    setRetailPrice('')
    setSalePrice('')
    setManufacturingDate('')
    setExpiryDate('')
    setFinalizeNotes('')
    setFinalizeOpen(true)
  }

  const handleFinalize = () => {
    // Inline validation — block negative prices (QA #53) and an expiry date
    // that precedes the manufacturing date (QA #54) before hitting the API.
    if (retailPrice.trim() !== '' && Number(retailPrice) < 0) {
      toast.error('Retail price cannot be negative')
      return
    }
    if (salePrice.trim() !== '' && Number(salePrice) < 0) {
      toast.error('Sale price cannot be negative')
      return
    }
    if (manufacturingDate && expiryDate && new Date(expiryDate) < new Date(manufacturingDate)) {
      toast.error('Expiry date cannot be earlier than the manufacturing date')
      return
    }
    // Sale price may not be lower than the retail price (QA #42). Finalizing sets
    // the price through the same update route, so enforce the rule here too.
    {
      const effRetail = retailPrice.trim() !== '' ? Number(retailPrice) : batch.retailPrice != null ? Number(batch.retailPrice) : undefined
      const effSale = salePrice.trim() !== '' ? Number(salePrice) : batch.salePrice != null ? Number(batch.salePrice) : undefined
      if (effRetail !== undefined && effSale !== undefined && effSale < effRetail) {
        toast.error('Sale price cannot be lower than the retail price')
        return
      }
    }

    finalize.mutate(
      {
        id: batch.id,
        data: {
          retailPrice: retailPrice.trim() !== '' ? Number(retailPrice) : undefined,
          salePrice: salePrice.trim() !== '' ? Number(salePrice) : undefined,
          manufacturingDate: manufacturingDate || undefined,
          expiryDate: expiryDate || undefined,
          notes: finalizeNotes.trim() !== '' ? finalizeNotes.trim() : undefined,
        },
      },
      {
        onSuccess: () => {
          setFinalizeOpen(false)
          setRetailPrice('')
          setSalePrice('')
          setManufacturingDate('')
          setExpiryDate('')
          setFinalizeNotes('')
        },
      },
    )
  }

  // Prefill + open the Update Batch dialog with the batch's current values (QA #45).
  const openUpdateDialog = () => {
    setEditRetailPrice(batch.retailPrice != null ? String(batch.retailPrice) : '')
    setEditSalePrice(batch.salePrice != null ? String(batch.salePrice) : '')
    setEditNotes(batch.notes ?? '')
    setEditStatus(
      UPDATABLE_STATUSES.includes(batch.status) ? batch.status : 'ACTIVE',
    )
    setUpdateOpen(true)
  }

  const handleUpdate = () => {
    if (editRetailPrice.trim() !== '' && Number(editRetailPrice) < 0) {
      toast.error('Retail price cannot be negative')
      return
    }
    if (editSalePrice.trim() !== '' && Number(editSalePrice) < 0) {
      toast.error('Sale price cannot be negative')
      return
    }
    // Sale price may not be lower than the retail price (QA #42). Compare the
    // effective values — the edited input when provided, otherwise what is
    // already on the batch.
    {
      const effRetail = editRetailPrice.trim() !== '' ? Number(editRetailPrice) : batch.retailPrice != null ? Number(batch.retailPrice) : undefined
      const effSale = editSalePrice.trim() !== '' ? Number(editSalePrice) : batch.salePrice != null ? Number(batch.salePrice) : undefined
      if (effRetail !== undefined && effSale !== undefined && effSale < effRetail) {
        toast.error('Sale price cannot be lower than the retail price')
        return
      }
    }

    updateBatch.mutate(
      {
        id: batch.id,
        data: {
          retailPrice: editRetailPrice.trim() !== '' ? Number(editRetailPrice) : undefined,
          salePrice: editSalePrice.trim() !== '' ? Number(editSalePrice) : undefined,
          notes: editNotes.trim() !== '' ? editNotes.trim() : undefined,
          // Only send status when it actually changed — the API rejects a no-op change.
          status: editStatus !== batch.status ? editStatus : undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('Product batch updated')
          setUpdateOpen(false)
        },
        onError: (err) => toast.error(errorMessage(err, 'Failed to update batch')),
      },
    )
  }

  // Reset the Start-New-Stage form every time the dialog opens (QA #49); the
  // site defaults to the batch's current site.
  const openStartDialog = () => {
    setStageName('')
    setStartSiteId(batch.siteId ?? '')
    setStartOpen(true)
  }

  const handleStartStage = () => {
    if (stageName.trim() === '') return
    startStage.mutate(
      {
        id: batch.id,
        data: {
          stageName: stageName.trim(),
          siteId: startSiteId || undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('Stage started')
          setStartOpen(false)
          setStageName('')
          setStartSiteId('')
        },
        onError: (err) => toast.error(errorMessage(err, 'Failed to start stage')),
      },
    )
  }

  // Fields start empty so the user must enter them explicitly (QA #46).
  const openCompleteDialog = (stage: ProductBatchStage) => {
    setCompleteStageRow(stage)
    setApprovedQuantity('')
    setRejectedQuantity('')
    setAdditionalCost('')
    setCompleteNotes('')
  }

  const handleCompleteStage = () => {
    if (!completeStageRow) return
    completeStage.mutate(
      {
        id: batch.id,
        stageId: completeStageRow.id,
        data: {
          approvedQuantity: Number(approvedQuantity),
          rejectedQuantity: rejectedQuantity.trim() !== '' ? Number(rejectedQuantity) : undefined,
          additionalCost: additionalCost.trim() !== '' ? Number(additionalCost) : undefined,
          notes: completeNotes.trim() !== '' ? completeNotes.trim() : undefined,
        },
      },
      {
        onSuccess: () => {
          toast.success('Stage completed')
          setCompleteStageRow(null)
          setApprovedQuantity('')
          setRejectedQuantity('')
          setAdditionalCost('')
          setCompleteNotes('')
        },
        onError: (err) => toast.error(errorMessage(err, 'Failed to complete stage')),
      },
    )
  }

  const handleCancelStage = () => {
    if (!cancelStageRow) return
    cancelStage.mutate(
      { id: batch.id, stageId: cancelStageRow.id },
      {
        onSuccess: () => {
          toast.success('Stage cancelled')
          setCancelStageRow(null)
        },
        onError: (err) => toast.error(errorMessage(err, 'Failed to cancel stage')),
      },
    )
  }

  return (
    <ProtectedRoute>
      <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/dashboard/product-batches')} className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Boxes className="h-8 w-8 text-green-600" /> {batch.batchNumber}
            </h1>
            <p className="text-gray-600 mt-1">
              {batch.product?.name ?? '—'}
              {batch.product?.code ? ` · ${batch.product.code}` : ''} · {batch.site?.name ?? 'No site'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {batch.isFinal && (
              <Badge variant="outline" className="border-green-300 text-green-700 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Finalized
              </Badge>
            )}
            <Badge className={`text-sm font-medium ${STATUS_STYLES[batch.status] ?? 'bg-gray-100 text-gray-700'}`}>{batch.status}</Badge>
            {!batch.isFinal && (
              <div className="flex flex-col items-end">
                <Button
                  variant="outline"
                  onClick={openStartDialog}
                  disabled={!canStartStage}
                >
                  <Play className="mr-2 h-4 w-4" /> Start New Stage
                </Button>
                {hasInProgressStage && (
                  <p className="text-xs text-gray-500 mt-1">Complete the in-progress stage first.</p>
                )}
              </div>
            )}
            <Button variant="outline" onClick={openUpdateDialog}>
              <Pencil className="mr-2 h-4 w-4" /> Update Batch
            </Button>
            {canFinalize && (
              <Button className="bg-green-600 hover:bg-green-700 text-white" onClick={openFinalizeDialog}>
                <PackageCheck className="mr-2 h-4 w-4" /> Finalize &amp; Push to Stock
              </Button>
            )}
          </div>
        </div>

        {/* Not-yet-finalized notice */}
        {!batch.isFinal && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="pt-6 flex items-start gap-3">
              <PackageCheck className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-amber-800">This batch is not finalized yet.</p>
                <p className="text-amber-700">
                  Set the selling price and finalize the batch to push{' '}
                  <span className="font-semibold">{qty(batch.availableQuantity)}</span> units into sellable
                  stock. Until then the product cannot be sold.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Current Stage</p><p className="text-2xl font-bold">{batch.currentStage}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Available</p><p className="text-2xl font-bold">{qty(batch.availableQuantity)}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Quantity</p><p className="text-2xl font-bold">{qty(batch.quantity)}</p></CardContent></Card>
          <Card><CardContent className="pt-6"><p className="text-sm text-gray-500">Cost / Unit</p><p className="text-2xl font-bold">{money(batch.costPerUnit)}</p></CardContent></Card>
        </div>

        {/* Quantities breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-base">Quantities</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
              <div><p className="text-gray-500">Produced</p><p className="font-semibold">{qty(batch.quantity)}</p></div>
              <div><p className="text-gray-500">Available</p><p className="font-semibold">{qty(batch.availableQuantity)}</p></div>
              <div><p className="text-gray-500">Consumed</p><p className="font-semibold">{qty(batch.consumedQuantity)}</p></div>
              <div><p className="text-gray-500">Reserved</p><p className="font-semibold">{qty(batch.reservedQuantity)}</p></div>
              <div><p className="text-gray-500">Returned</p><p className="font-semibold">{qty(batch.returnedQuantity)}</p></div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing & dates */}
        <Card>
          <CardHeader><CardTitle className="text-base">Pricing & Dates</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div><p className="text-gray-500">Cost / Unit</p><p className="font-semibold">{money(batch.costPerUnit)}</p></div>
              <div><p className="text-gray-500">Retail Price</p><p className="font-semibold">{batch.retailPrice != null ? money(batch.retailPrice) : '—'}</p></div>
              <div><p className="text-gray-500">Sale Price</p><p className="font-semibold">{batch.salePrice != null ? money(batch.salePrice) : '—'}</p></div>
              <div><p className="text-gray-500">Production Order</p><p className="font-semibold font-mono">{batch.productionOrder?.orderNumber ?? '—'}</p></div>
              <div><p className="text-gray-500">Manufacturing Date</p><p className="font-semibold">{formatDate(batch.manufacturingDate)}</p></div>
              <div><p className="text-gray-500">Expiry Date</p><p className="font-semibold">{formatDate(batch.expiryDate)}</p></div>
              <div><p className="text-gray-500">Created</p><p className="font-semibold">{formatDate(batch.createdAt)}</p></div>
              <div><p className="text-gray-500">Updated</p><p className="font-semibold">{formatDate(batch.updatedAt)}</p></div>
            </div>
            {batch.productionOrder?.id && (
              <Button
                variant="link"
                className="px-0 mt-3 h-auto text-green-700"
                onClick={() => router.push(`/dashboard/production-orders/${batch.productionOrder!.id}`)}
              >
                View production order →
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Stage timeline */}
        <Card>
          <CardHeader><CardTitle className="text-base">Stage History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>Stage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Received</TableHead>
                  <TableHead className="text-right">Approved</TableHead>
                  <TableHead className="text-right">Rejected</TableHead>
                  <TableHead className="text-right">Add. Cost</TableHead>
                  <TableHead className="text-right">Cost / Unit</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead>Completed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stages.length === 0 ? (
                  <TableRow><TableCell colSpan={10} className="text-center py-6 text-gray-500">No stages recorded</TableCell></TableRow>
                ) : stages.map(stage => (
                  <TableRow key={stage.id}>
                    <TableCell className="font-medium">{stage.stageName}</TableCell>
                    <TableCell>
                      <Badge className={`font-medium ${STAGE_STATUS_STYLES[stage.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {stage.status.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{qty(stage.receivedQuantity)}</TableCell>
                    <TableCell className="text-right">{stage.approvedQuantity != null ? qty(stage.approvedQuantity) : '—'}</TableCell>
                    <TableCell className="text-right">{stage.rejectedQuantity != null ? qty(stage.rejectedQuantity) : '—'}</TableCell>
                    <TableCell className="text-right">{stage.additionalCost != null ? money(stage.additionalCost) : '—'}</TableCell>
                    <TableCell className="text-right">{stage.costPerUnit != null ? money(stage.costPerUnit) : '—'}</TableCell>
                    <TableCell className="text-xs text-gray-600">{formatDate(stage.startedAt)}</TableCell>
                    <TableCell className="text-xs text-gray-600">{formatDate(stage.completedAt)}</TableCell>
                    <TableCell className="text-right">
                      {stage.status === 'IN_PROGRESS' ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => openCompleteDialog(stage)}
                          >
                            <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Complete
                          </Button>
                          {canCancelStage(stage) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-300 text-red-600 hover:bg-red-50"
                              onClick={() => setCancelStageRow(stage)}
                            >
                              <XCircle className="mr-1 h-3.5 w-3.5" /> Cancel
                            </Button>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {batch.notes && <Card><CardContent className="pt-6"><p className="text-sm text-gray-500 mb-1">Notes</p><p className="text-gray-800">{batch.notes}</p></CardContent></Card>}

        {/* Finalize dialog */}
        <Dialog open={finalizeOpen} onOpenChange={(open) => !finalize.isPending && setFinalizeOpen(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Finalize &amp; Push to Stock</DialogTitle>
              <DialogDescription>
                Set the selling price and release {qty(batch.availableQuantity)} units of{' '}
                {batch.product?.name ?? 'this product'} into sellable stock. This cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="retailPrice">Retail Price (Rs.)</Label>
                <Input
                  id="retailPrice"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="e.g. 1500"
                  value={retailPrice}
                  onChange={(e) => setRetailPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="salePrice">Sale Price (Rs.)</Label>
                <Input
                  id="salePrice"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Optional"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manufacturingDate">Manufacturing Date</Label>
                <Input
                  id="manufacturingDate"
                  type="date"
                  value={manufacturingDate}
                  onChange={(e) => setManufacturingDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="finalizeNotes">Notes</Label>
                <Textarea
                  id="finalizeNotes"
                  placeholder="Optional notes for this finished batch"
                  value={finalizeNotes}
                  onChange={(e) => setFinalizeNotes(e.target.value)}
                />
              </div>
            </div>

            <p className="text-xs text-gray-500">
              Retail price is recommended so the finished goods carry a selling price. You can adjust
              prices later from the batch.
            </p>

            <DialogFooter>
              <Button variant="outline" onClick={() => setFinalizeOpen(false)} disabled={finalize.isPending}>
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleFinalize}
                disabled={finalize.isPending}
              >
                {finalize.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Finalizing…</>
                ) : (
                  <><PackageCheck className="mr-2 h-4 w-4" /> Finalize</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Update batch dialog (QA #45) */}
        <Dialog open={updateOpen} onOpenChange={(open) => !updateBatch.isPending && setUpdateOpen(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Product Batch</DialogTitle>
              <DialogDescription>
                Manually override the selling price, notes, or status for {batch.batchNumber}. This
                does not affect stage flow or stock.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="editRetailPrice">Retail Price (Rs.)</Label>
                <Input
                  id="editRetailPrice"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="e.g. 1500"
                  value={editRetailPrice}
                  onChange={(e) => setEditRetailPrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="editSalePrice">Sale Price (Rs.)</Label>
                <Input
                  id="editSalePrice"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="Optional"
                  value={editSalePrice}
                  onChange={(e) => setEditSalePrice(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="editStatus">Status</Label>
                <Select value={editStatus} onValueChange={(v) => setEditStatus(v as ProductBatchStatus)}>
                  <SelectTrigger id="editStatus">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                    {UPDATABLE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="editNotes">Notes</Label>
                <Textarea
                  id="editNotes"
                  placeholder="Optional notes"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setUpdateOpen(false)} disabled={updateBatch.isPending}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={updateBatch.isPending}>
                {updateBatch.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                ) : (
                  <><Pencil className="mr-2 h-4 w-4" /> Save Changes</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Start new stage dialog */}
        <Dialog open={startOpen} onOpenChange={(open) => !startStage.isPending && setStartOpen(open)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start New Stage</DialogTitle>
              <DialogDescription>
                Start a new processing stage for batch {batch.batchNumber}. The previous stage must be
                completed first.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="stageName">Stage Name</Label>
                <Input
                  id="stageName"
                  placeholder="e.g. Packing, QC"
                  value={stageName}
                  onChange={(e) => setStageName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="startSiteId">Site</Label>
                <Select value={startSiteId} onValueChange={setStartSiteId}>
                  <SelectTrigger id="startSiteId">
                    <SelectValue placeholder="Select site" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                    {sites.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}{s.code ? ` (${s.code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStartOpen(false)} disabled={startStage.isPending}>
                Cancel
              </Button>
              <Button
                onClick={handleStartStage}
                disabled={startStage.isPending || stageName.trim() === ''}
              >
                {startStage.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Starting…</>
                ) : (
                  <><Play className="mr-2 h-4 w-4" /> Start Stage</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Complete stage dialog */}
        <Dialog open={!!completeStageRow} onOpenChange={(open) => !completeStage.isPending && !open && setCompleteStageRow(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Complete Stage{completeStageRow ? ` — ${completeStageRow.stageName}` : ''}</DialogTitle>
              <DialogDescription>
                Record the approved and rejected quantities for this stage. The approved quantity carries
                forward to the next stage.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="approvedQuantity">Approved Quantity</Label>
                <Input
                  id="approvedQuantity"
                  type="number"
                  min={0}
                  value={approvedQuantity}
                  onChange={(e) => setApprovedQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rejectedQuantity">Rejected Quantity</Label>
                <Input
                  id="rejectedQuantity"
                  type="number"
                  min={0}
                  placeholder="0"
                  value={rejectedQuantity}
                  onChange={(e) => setRejectedQuantity(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="additionalCost">Additional Cost (Rs.)</Label>
                <Input
                  id="additionalCost"
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0"
                  value={additionalCost}
                  onChange={(e) => setAdditionalCost(e.target.value)}
                />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label htmlFor="completeNotes">Notes</Label>
                <Textarea
                  id="completeNotes"
                  placeholder="Optional notes for this stage"
                  value={completeNotes}
                  onChange={(e) => setCompleteNotes(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCompleteStageRow(null)} disabled={completeStage.isPending}>
                Cancel
              </Button>
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleCompleteStage}
                disabled={completeStage.isPending || approvedQuantity.trim() === ''}
              >
                {completeStage.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Completing…</>
                ) : (
                  <><CheckCircle2 className="mr-2 h-4 w-4" /> Complete Stage</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel stage confirm dialog */}
        <Dialog open={!!cancelStageRow} onOpenChange={(open) => !cancelStage.isPending && !open && setCancelStageRow(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancel Stage{cancelStageRow ? ` — ${cancelStageRow.stageName}` : ''}</DialogTitle>
              <DialogDescription>
                Cancel this stage and revert to the previous stage state? This cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelStageRow(null)} disabled={cancelStage.isPending}>
                Keep Stage
              </Button>
              <Button
                className="bg-red-600 hover:bg-red-700 text-white"
                onClick={handleCancelStage}
                disabled={cancelStage.isPending}
              >
                {cancelStage.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cancelling…</>
                ) : (
                  <><XCircle className="mr-2 h-4 w-4" /> Cancel Stage</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
