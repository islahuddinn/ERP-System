'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Edit, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useRawMaterial } from '@/hooks/useRawMaterials'
import { formatCurrency } from '@/lib/currency'
import { useRawMaterialBatches, useFIFOAllocation } from '@/hooks/useRawMaterialBatches'
import type { RawMaterialBatch } from '@/types/common'
import { format } from 'date-fns'

const STATUS_VARIANTS: Record<string, string> = {
  ACTIVE: 'default',
  PARTIAL: 'secondary',
  CONSUMED: 'outline',
  REJECTED: 'destructive',
}

function BatchesTab({ rawMaterialId }: { rawMaterialId: string }) {
  const [page, setPage] = useState(1)
  const { data: responseData, isLoading } = useRawMaterialBatches({ rawMaterialId, page, limit: 10 })
  const router = useRouter()

  const batches: RawMaterialBatch[] = Array.isArray(responseData) ? responseData : responseData?.data ?? []
  const meta = Array.isArray(responseData) ? null : responseData?.meta

  if (isLoading) return <p className="text-muted-foreground p-4">Loading batches…</p>

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Batch #</TableHead>
            <TableHead>Received</TableHead>
            <TableHead>Consumed</TableHead>
            <TableHead>Available</TableHead>
            <TableHead>Expiry</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batches.length === 0 ? (
            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No batches found</TableCell></TableRow>
          ) : batches.map(batch => (
            <TableRow key={batch.id} className="cursor-pointer hover:bg-gray-50"
              onClick={() => router.push(`/dashboard/raw-materials/batches/${batch.id}`)}>
              <TableCell className="font-mono text-xs">{batch.batchNumber}</TableCell>
              <TableCell>{batch.receivedQuantity}</TableCell>
              <TableCell>{batch.consumedQuantity}</TableCell>
              <TableCell>
                {batch.availableQuantity <= 0
                  ? <Badge variant="outline" className="text-muted-foreground">0</Badge>
                  : batch.availableQuantity
                }
              </TableCell>
              <TableCell>
                {batch.expiryDate
                  ? new Date(batch.expiryDate).toLocaleDateString()
                  : <span className="text-muted-foreground">—</span>
                }
              </TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[batch.status] as any ?? 'outline'}>
                  {batch.status}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {meta && (
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => setPage(p => p - 1)} disabled={!meta.hasPrev}>Previous</Button>
          <Button variant="outline" size="sm" onClick={() => setPage(p => p + 1)} disabled={!meta.hasNext}>Next</Button>
        </div>
      )}
    </div>
  )
}

function FIFOTab({ rawMaterialId, uomSymbol }: { rawMaterialId: string; uomSymbol?: string }) {
  const [qty, setQty] = useState<number>(0)
  const [queryQty, setQueryQty] = useState<number | undefined>(undefined)
  const { data: allocation, isLoading } = useFIFOAllocation(rawMaterialId, queryQty)
  const sym = uomSymbol ?? ''

  // Negative quantities are invalid — surface a message instead of silently
  // ignoring them (the button is disabled but users had no feedback). QA #7.
  const isNegative = qty < 0

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-end">
        <div>
          <Label>Quantity to Allocate {sym ? `(${sym})` : ''}</Label>
          <Input
            type="number" min={0} step="0.001"
            value={qty || ''}
            placeholder="Enter quantity"
            onChange={e => setQty(parseFloat(e.target.value) || 0)}
            className="w-44 mt-1.5"
            aria-invalid={isNegative}
          />
          {isNegative && (
            <p className="text-sm text-destructive mt-1">Quantity cannot be negative</p>
          )}
        </div>
        <Button onClick={() => setQueryQty(qty)} disabled={qty <= 0}>
          Calculate FIFO
        </Button>
        {queryQty !== undefined && (
          <Button variant="ghost" size="sm" onClick={() => { setQueryQty(undefined); setQty(0) }}>
            Clear
          </Button>
        )}
      </div>

      {isLoading && <p className="text-muted-foreground text-sm">Calculating…</p>}

      {allocation && !isLoading && (
        <div className="space-y-4">
          {/* Summary row */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: 'Requested', value: `${allocation.requestedQuantity} ${sym}` },
              { label: 'Total Available', value: `${allocation.totalAvailable} ${sym}` },
              { label: 'Will Allocate', value: `${allocation.totalAllocated} ${sym}` },
              { label: 'Shortfall', value: `${allocation.shortfall} ${sym}` },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500">{item.label}</p>
                <p className="font-semibold text-sm mt-0.5 text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>

          {/* Fulfilled status */}
          <div className={`flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-md ${allocation.isFulfilled ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {allocation.isFulfilled
              ? <><CheckCircle2 className="h-4 w-4" /> Fully fulfilled — all {allocation.requestedQuantity} {sym} can be allocated</>
              : <><XCircle className="h-4 w-4" /> Partially fulfilled — {allocation.shortfall} {sym} short</>
            }
          </div>

          {/* Allocation table */}
          {allocation.allocations?.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Batch #</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Allocate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allocation.allocations.map((a: any) => (
                  <TableRow key={a.batchId}>
                    <TableCell className="font-mono text-xs">{a.batchNumber}</TableCell>
                    <TableCell className="text-sm">
                      {a.expiryDate ? format(new Date(a.expiryDate), 'MMM dd, yyyy') : <span className="text-muted-foreground">No expiry</span>}
                    </TableCell>
                    <TableCell className="text-sm">{a.site?.name ?? '—'}</TableCell>
                    <TableCell className="text-right text-sm">{a.totalAvailableQty} {sym}</TableCell>
                    <TableCell className="text-right text-sm font-semibold text-green-700">{a.allocateQty} {sym}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {queryQty !== undefined && !isLoading && !allocation && (
        <p className="text-muted-foreground text-sm">No available batches found for this material.</p>
      )}
    </div>
  )
}

export default function RawMaterialDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: rm, isLoading } = useRawMaterial(id)

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading…</div>
  if (!rm) return <div className="p-8 text-muted-foreground">Raw material not found</div>

  const isLowStock = rm.currentStock <= rm.reorderLevel

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">{rm.name}</h2>
            {isLowStock && <AlertTriangle className="h-5 w-5 text-amber-500" />}
          </div>
          <p className="text-muted-foreground font-mono text-sm">{rm.code}</p>
        </div>
        <div className="flex items-center gap-2">
          <ViewHistoryButton entityName="RawMaterial" entityId={id} size="default" />
          <Button onClick={() => router.push(`/dashboard/raw-materials/${id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" /> Edit
          </Button>
        </div>
      </div>

      <Tabs defaultValue="info">
        <TabsList className="bg-gray-100 border border-gray-200">
          <TabsTrigger
            value="info"
            className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-green-700 data-[state=active]:shadow-sm"
          >
            Info
          </TabsTrigger>
          <TabsTrigger
            value="batches"
            className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-green-700 data-[state=active]:shadow-sm"
          >
            Batches
          </TabsTrigger>
          <TabsTrigger
            value="fifo"
            className="data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:border data-[state=active]:border-green-700 data-[state=active]:shadow-sm"
          >
            FIFO View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle>Details</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">UOM</p>
                  <p className="font-medium">{rm.uom?.name ?? '—'} {rm.uom?.symbol ? `(${rm.uom.symbol})` : ''}</p>
                </div>
                {rm.description && (
                  <div>
                    <p className="text-muted-foreground">Description</p>
                    <p>{rm.description}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Last Purchase Price</p>
                  <p className="font-medium">
                    {rm.lastPurchasePrice !== null &&
                    rm.lastPurchasePrice !== undefined &&
                    Number(rm.lastPurchasePrice) > 0
                      ? formatCurrency(Number(rm.lastPurchasePrice))
                      : '—'}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Stock</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Stock</span>
                  <span className={isLowStock ? 'text-amber-600 font-semibold' : 'font-medium'}>
                    {Number(rm.currentStock ?? 0).toFixed(2)} {rm.uom?.symbol}
                    {isLowStock && ' ⚠'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reorder Level</span>
                  <span>{rm.reorderLevel} {rm.uom?.symbol}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="batches">
          <Card>
            <CardContent className="p-0">
              <BatchesTab rawMaterialId={id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fifo">
          <Card>
            <CardHeader><CardTitle>FIFO Allocation Calculator</CardTitle></CardHeader>
            <CardContent>
              <FIFOTab rawMaterialId={id} uomSymbol={rm.uom?.symbol} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
