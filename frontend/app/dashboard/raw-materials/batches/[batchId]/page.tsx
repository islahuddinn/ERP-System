'use client'

import { useState } from 'react'
import { toast } from 'react-hot-toast'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Loader2, FlaskConical, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/currency'
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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import {
  useRawMaterialBatch,
  useBatchConsumptions,
  useConsumeFromBatch,
  useUpdateBatch,
  useCreateBatchInspection,
  useUpdateBatchInspection,
  useGetBatchInspections,
  type InspectionType,
  type QualityStatus,
  type BatchInspection,
} from '@/hooks/useRawMaterialBatches'

const STATUS_VARIANTS: Record<string, string> = {
  ACTIVE: 'default',
  PARTIAL: 'secondary',
  CONSUMED: 'outline',
  EXPIRED: 'destructive',
  BLOCKED: 'destructive',
  QUARANTINE: 'secondary',
}

const QUALITY_STATUS_COLORS: Record<string, string> = {
  PASSED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  CONDITIONAL: 'bg-yellow-100 text-yellow-800',
  PENDING: 'bg-gray-100 text-gray-800',
}

// Human-readable labels for system-generated consumption reference types.
const REFERENCE_TYPE_LABELS: Record<string, string> = {
  QUALITY_REJECTION: 'Quality Rejection',
  QUALITY_REJECTION_ADJUSTMENT: 'Quality Rejection (adjustment)',
  PURCHASE_RETURN: 'Purchase Return',
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Quantity formatter (NOT currency) — trims noisy float tails (e.g. 12.3000000001)
// to at most 3 decimals with thousands separators, matching how quantities are
// shown elsewhere (product-batches list/detail). QA: unformatted decimals.
const qty = (v: unknown): string =>
  Number(v ?? 0).toLocaleString('en-US', { maximumFractionDigits: 3 })

// QA #18: the Reference column used to render the raw internal id (a UUID for
// system records). Prefer a human reference number/code, then a friendly label
// for system reference types, then a user-typed referenceId, falling back to '—'.
function consumptionReference(c: {
  reference?: string
  referenceNumber?: string
  referenceType?: string
  referenceId?: string
}): string {
  if (c.referenceNumber) return c.referenceNumber
  if (c.reference) return c.reference
  if (c.referenceType && REFERENCE_TYPE_LABELS[c.referenceType]) {
    return REFERENCE_TYPE_LABELS[c.referenceType]
  }
  // A user-supplied referenceId (e.g. "Production Order PO-001") is meaningful;
  // a bare UUID is an internal id and should not be shown.
  if (c.referenceId && !UUID_RE.test(c.referenceId)) return c.referenceId
  if (c.referenceType) return c.referenceType
  return '—'
}

export default function BatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>()
  const router = useRouter()
  const { data: batch, isLoading } = useRawMaterialBatch(batchId)
  const { data: consumptions = [] } = useBatchConsumptions(batchId)
  const { data: inspections = [] } = useGetBatchInspections(batchId)
  const consumeMutation = useConsumeFromBatch()
  const updateMutation = useUpdateBatch()
  const inspectMutation = useCreateBatchInspection()
  const updateInspectionMutation = useUpdateBatchInspection()

  const [showConsumeModal, setShowConsumeModal] = useState(false)
  // Clearable-number pattern: keep the raw string so the field can be emptied
  // (default '' shows no value, not 0) — QA #20/#21.
  const [consumeQty, setConsumeQty] = useState('')
  const [consumeTouched, setConsumeTouched] = useState(false)
  const [consumeRef, setConsumeRef] = useState('')
  const [consumeNotes, setConsumeNotes] = useState('')

  const [showBlockModal, setShowBlockModal] = useState(false)
  const [blockStatus, setBlockStatus] = useState<'BLOCKED' | 'QUARANTINE'>('BLOCKED')
  const [blockNotes, setBlockNotes] = useState('')

  const [showInspectModal, setShowInspectModal] = useState(false)
  const [inspectionType, setInspectionType] = useState<InspectionType | ''>('')
  const [qualityStatus, setQualityStatus] = useState<QualityStatus | ''>('')
  const [inspResults, setInspResults] = useState('')
  const [inspRejectedQty, setInspRejectedQty] = useState<number | undefined>(undefined)
  const [inspNotes, setInspNotes] = useState('')

  // Edit-inspection dialog state — fields mirror the update API
  // (qualityStatus, approvedQuantity, rejectedQuantity, results, observations, notes).
  // Inspection Type is shown read-only since the update endpoint doesn't change it.
  const [editInsp, setEditInsp] = useState<BatchInspection | null>(null)
  const [editInspQuality, setEditInspQuality] = useState<QualityStatus>('PENDING')
  const [editInspResults, setEditInspResults] = useState('')
  const [editInspApprovedQty, setEditInspApprovedQty] = useState<number | undefined>(undefined)
  const [editInspRejectedQty, setEditInspRejectedQty] = useState<number | undefined>(undefined)
  const [editInspObservations, setEditInspObservations] = useState('')
  const [editInspNotes, setEditInspNotes] = useState('')

  const openEditInspection = (insp: BatchInspection) => {
    setEditInsp(insp)
    setEditInspQuality(insp.qualityStatus)
    setEditInspResults(insp.results ?? '')
    setEditInspApprovedQty(insp.approvedQuantity ?? undefined)
    setEditInspRejectedQty(insp.rejectedQuantity ?? undefined)
    setEditInspObservations((insp.observations ?? []).join('\n'))
    setEditInspNotes(insp.notes ?? '')
  }

  const handleUpdateInspection = async () => {
    if (!editInsp || !editInspResults.trim()) return
    const observations = editInspObservations
      .split('\n')
      .map(o => o.trim())
      .filter(Boolean)
    await updateInspectionMutation.mutateAsync({
      inspectionId: editInsp.id,
      data: {
        qualityStatus: editInspQuality,
        approvedQuantity: editInspApprovedQty,
        rejectedQuantity: editInspRejectedQty,
        results: editInspResults,
        observations: observations.length ? observations : undefined,
        notes: editInspNotes || undefined,
      },
    })
    setEditInsp(null)
  }

  const canConsume = batch?.status === 'ACTIVE' || batch?.status === 'PARTIAL'

  // Numeric view of the clearable quantity string (NaN when empty).
  const consumeQtyNum = parseFloat(consumeQty)
  const consumeQtyValid = consumeQty.trim() !== '' && !Number.isNaN(consumeQtyNum) && consumeQtyNum > 0

  // Reset the Record Consumption form so previously entered values never persist
  // across reopens (QA #22) and the quantity always starts empty (QA #20).
  const resetConsumeForm = () => {
    setConsumeQty('')
    setConsumeTouched(false)
    setConsumeRef('')
    setConsumeNotes('')
  }

  const handleConsume = async () => {
    if (!consumeQtyValid) return
    await consumeMutation.mutateAsync({
      batchId,
      data: {
        quantity: consumeQtyNum,
        referenceId: consumeRef || undefined,
        notes: consumeNotes || undefined,
      }
    })
    setShowConsumeModal(false)
    resetConsumeForm()
  }

  const openBlockModal = () => {
    setBlockStatus('BLOCKED')
    setBlockNotes('')
    setShowBlockModal(true)
  }

  const handleBlock = async () => {
    await updateMutation.mutateAsync({
      id: batchId,
      data: { status: blockStatus, notes: blockNotes.trim() || undefined },
    })
    setShowBlockModal(false)
    setBlockNotes('')
  }

  // Reset the Record Inspection form to defaults so previously entered values never
  // persist across reopens (QA #27).
  const resetInspectForm = () => {
    setInspectionType('')
    setQualityStatus('')
    setInspResults('')
    setInspRejectedQty(undefined)
    setInspNotes('')
  }

  const handleInspect = async () => {
    if (!inspResults.trim()) return
    if (!inspectionType || !qualityStatus) {
      toast.error('Inspection type and quality status are required')
      return
    }
    await inspectMutation.mutateAsync({
      batchId,
      data: {
        inspectionType: inspectionType as InspectionType,
        qualityStatus: qualityStatus as QualityStatus,
        results: inspResults,
        rejectedQuantity: inspRejectedQty,
        notes: inspNotes || undefined,
      }
    })
    setShowInspectModal(false)
    resetInspectForm()
  }

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>
  if (!batch) return <div className="p-8 text-muted-foreground">Batch not found</div>

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <h2 className="text-3xl font-bold tracking-tight font-mono text-gray-900">{batch.batchNumber}</h2>
          <p className="text-gray-500">{batch.rawMaterial?.name} · {batch.site?.name}</p>
        </div>
        <Badge variant={STATUS_VARIANTS[batch.status] as any ?? 'outline'}>{batch.status}</Badge>
        {inspections.length === 0 && (
          <Button variant="outline" size="sm" onClick={() => setShowInspectModal(true)}>
            <FlaskConical className="h-4 w-4 mr-1" /> Record Inspection
          </Button>
        )}
        {canConsume && (
          <Button onClick={() => { resetConsumeForm(); setShowConsumeModal(true) }}>Record Consumption</Button>
        )}
        {batch.status !== 'BLOCKED' && batch.status !== 'CONSUMED' && (
          <Button variant="destructive" onClick={openBlockModal} disabled={updateMutation.isPending}>
            Mark as Blocked
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader><CardTitle>Batch Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Received Date</p>
              <p className="font-medium">{new Date(batch.receivedDate).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-gray-600">Unit Cost</p>
              <p className="font-medium">{formatCurrency(batch.unitCost)}</p>
            </div>
            {batch.manufacturingDate && (
              <div>
                <p className="text-gray-600">Manufacture Date</p>
                <p className="font-medium">{new Date(batch.manufacturingDate).toLocaleDateString()}</p>
              </div>
            )}
            {batch.expiryDate && (
              <div>
                <p className="text-gray-600">Expiry Date</p>
                <p className="font-medium">{new Date(batch.expiryDate).toLocaleDateString()}</p>
              </div>
            )}
            {batch.grnItem?.grn && (
              <div className="col-span-2">
                <p className="text-gray-600">GRN Reference</p>
                <p className="font-medium">
                  {[batch.grnItem.grn.receivingNumber, batch.grnItem.grn.supplier?.name]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
            )}
            {batch.notes && (
              <div className="col-span-2">
                <p className="text-gray-600">Notes</p>
                <p>{batch.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Quantities</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Received</span>
              <span>{qty(batch.receivedQuantity)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Consumed</span>
              <span>{qty(batch.consumedQuantity)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="font-medium">Available</span>
              <span className="font-bold">{qty(batch.availableQuantity)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inspection History */}
      <Card className="overflow-hidden">
        <CardHeader><CardTitle>Inspection History</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quality Status</TableHead>
                <TableHead>Results</TableHead>
                <TableHead>Rejected Qty</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {inspections.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No inspections recorded
                  </TableCell>
                </TableRow>
              ) : [...inspections]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map(insp => (
                <TableRow key={insp.id}>
                  <TableCell>{new Date(insp.createdAt).toLocaleDateString()}</TableCell>
                  <TableCell>{insp.inspectionType}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${QUALITY_STATUS_COLORS[insp.qualityStatus] ?? 'bg-gray-100 text-gray-800'}`}>
                      {insp.qualityStatus}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-xs truncate text-muted-foreground">{insp.results}</TableCell>
                  <TableCell>{insp.rejectedQuantity != null ? qty(insp.rejectedQuantity) : '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{insp.notes ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => openEditInspection(insp)} className="text-gray-600 hover:text-gray-900" title="Edit inspection">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Consumption History */}
      <Card className="overflow-hidden">
        <CardHeader><CardTitle>Consumption History</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Remaining After</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consumptions.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No consumptions recorded</TableCell></TableRow>
              ) : [...consumptions].sort((a, b) => new Date(b.consumedDate).getTime() - new Date(a.consumedDate).getTime()).map(c => (
                <TableRow key={c.id}>
                  <TableCell>{new Date(c.consumedDate).toLocaleDateString()}</TableCell>
                  <TableCell className="font-medium">{qty(c.consumedQuantity)}</TableCell>
                  <TableCell>{qty(c.remainingAfter)}</TableCell>
                  <TableCell className="text-muted-foreground">{consumptionReference(c)}</TableCell>
                  <TableCell className="text-muted-foreground">{c.notes ?? '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Block / Quarantine Modal */}
      <Dialog open={showBlockModal} onOpenChange={(open) => { setShowBlockModal(open); if (!open) setBlockNotes('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Batch Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Status</Label>
              <Select value={blockStatus} onValueChange={(v) => setBlockStatus(v as 'BLOCKED' | 'QUARANTINE')}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                  <SelectItem value="BLOCKED">Blocked (hold)</SelectItem>
                  <SelectItem value="QUARANTINE">Quarantine (re-inspect)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notes</Label>
              <Textarea
                value={blockNotes}
                onChange={e => setBlockNotes(e.target.value)}
                placeholder="Reason / description (optional)"
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockModal(false)} disabled={updateMutation.isPending}>Cancel</Button>
            <Button variant="destructive" onClick={handleBlock} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? 'Saving…' : `Mark as ${blockStatus === 'BLOCKED' ? 'Blocked' : 'Quarantine'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Consume Modal */}
      <Dialog
        open={showConsumeModal}
        onOpenChange={(open) => {
          setShowConsumeModal(open)
          // Reset the form on every open/close so stale values never persist (QA #22).
          if (!open) resetConsumeForm()
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Consumption</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Quantity (max: {qty(batch.availableQuantity)})</Label>
              <Input type="number" min={0.01} max={batch.availableQuantity} step="0.01"
                placeholder="Enter quantity"
                value={consumeQty}
                onChange={e => { setConsumeQty(e.target.value); setConsumeTouched(true) }}
                className="mt-1.5" />
              {consumeQtyNum > batch.availableQuantity ? (
                <p className="text-sm text-destructive mt-1">
                  Quantity cannot exceed the available quantity ({batch.availableQuantity})
                </p>
              ) : consumeTouched && consumeQty.trim() === '' ? (
                <p className="text-sm text-destructive mt-1">
                  Quantity is required
                </p>
              ) : consumeTouched && (Number.isNaN(consumeQtyNum) || consumeQtyNum <= 0) ? (
                <p className="text-sm text-destructive mt-1">
                  Quantity must be greater than 0
                </p>
              ) : null}
            </div>
            <div>
              <Label>Reference ID (optional)</Label>
              <Input placeholder="e.g. Production Order PO-001" value={consumeRef}
                onChange={e => setConsumeRef(e.target.value)} className="mt-1.5" />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={consumeNotes} onChange={e => setConsumeNotes(e.target.value)} rows={2} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowConsumeModal(false); resetConsumeForm() }}>Cancel</Button>
            <Button
              onClick={handleConsume}
              disabled={consumeMutation.isPending || !consumeQtyValid || consumeQtyNum > batch.availableQuantity}
            >
              {consumeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Inspection Modal */}
      <Dialog open={!!editInsp} onOpenChange={(open) => { if (!open) setEditInsp(null) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Inspection{editInsp ? ` — ${editInsp.inspectionNumber}` : ''}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-gray-700">Inspection Type</Label>
              <Input value={editInsp?.inspectionType ?? ''} readOnly className="mt-1.5 bg-gray-50" />
            </div>
            <div>
              <Label className="text-gray-700">Quality Status</Label>
              <Select value={editInspQuality} onValueChange={v => setEditInspQuality(v as QualityStatus)}>
                <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PASSED">Passed</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="CONDITIONAL">Conditional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700">Results *</Label>
              <Textarea value={editInspResults} onChange={e => setEditInspResults(e.target.value)} rows={3} className="mt-1.5" placeholder="Describe inspection findings…" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-700">Approved Quantity (optional)</Label>
                <Input type="number" min={0} step="0.01" value={editInspApprovedQty ?? ''} onChange={e => setEditInspApprovedQty(e.target.value ? parseFloat(e.target.value) : undefined)} className="mt-1.5" />
              </div>
              <div>
                <Label className="text-gray-700">Rejected Quantity (optional)</Label>
                <Input type="number" min={0} step="0.01" value={editInspRejectedQty ?? ''} onChange={e => setEditInspRejectedQty(e.target.value ? parseFloat(e.target.value) : undefined)} className="mt-1.5" />
              </div>
            </div>
            <div>
              <Label className="text-gray-700">Observations (optional, one per line)</Label>
              <Textarea value={editInspObservations} onChange={e => setEditInspObservations(e.target.value)} rows={2} className="mt-1.5" placeholder="One observation per line" />
            </div>
            <div>
              <Label className="text-gray-700">Notes (optional)</Label>
              <Textarea value={editInspNotes} onChange={e => setEditInspNotes(e.target.value)} rows={2} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditInsp(null)} disabled={updateInspectionMutation.isPending}>Cancel</Button>
            <Button onClick={handleUpdateInspection} disabled={updateInspectionMutation.isPending || !editInspResults.trim()}>
              {updateInspectionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Inspect Modal */}
      <Dialog
        open={showInspectModal}
        onOpenChange={(open) => {
          setShowInspectModal(open)
          // Clear the form on every open/close so stale values never persist (QA #27).
          resetInspectForm()
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Inspection</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-gray-700">Inspection Type</Label>
              <Select value={inspectionType || undefined} onValueChange={v => setInspectionType(v as InspectionType)}>
                <SelectTrigger className="mt-1.5 text-gray-900">
                  <SelectValue placeholder="Select inspection type" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                  <SelectItem value="VISUAL">Visual</SelectItem>
                  <SelectItem value="DIMENSIONAL">Dimensional</SelectItem>
                  <SelectItem value="FUNCTIONAL">Functional</SelectItem>
                  <SelectItem value="LAB_TEST">Lab Test</SelectItem>
                  <SelectItem value="DOCUMENTATION">Documentation</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700">Quality Status</Label>
              <Select value={qualityStatus || undefined} onValueChange={v => setQualityStatus(v as QualityStatus)}>
                <SelectTrigger className="mt-1.5 text-gray-900">
                  <SelectValue placeholder="Select quality status" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="PASSED">Passed</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="CONDITIONAL">Conditional</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Results *</Label>
              <Textarea
                value={inspResults}
                onChange={e => setInspResults(e.target.value)}
                placeholder="Describe inspection findings…"
                rows={3}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Rejected Quantity (optional)</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={inspRejectedQty ?? ''}
                onChange={e => setInspRejectedQty(e.target.value ? parseFloat(e.target.value) : undefined)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Notes (optional)</Label>
              <Textarea value={inspNotes} onChange={e => setInspNotes(e.target.value)} rows={2} className="mt-1.5" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowInspectModal(false); resetInspectForm() }}>Cancel</Button>
            <Button
              onClick={handleInspect}
              disabled={inspectMutation.isPending || !inspResults.trim() || !inspectionType || !qualityStatus}
            >
              {inspectMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
