'use client'

import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useWarehouses, useWarehouseZones } from '@/hooks/useWarehouses'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { toast } from 'react-hot-toast'
import { apiClient } from '@/lib/api-client'
import { format } from 'date-fns'
import { Package, Calendar, AlertCircle } from 'lucide-react'

type PurchaseOrder = {
  id: string
  orderNumber: string
  expectedDate?: string | null
  status: 'DRAFT' | 'CONFIRMED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED'
  supplier: { id: string; name: string }
}

type PurchaseDetail = {
  id: string
  orderNumber: string
  expectedDate?: string | null
  status: 'DRAFT' | 'CONFIRMED' | 'PARTIAL' | 'RECEIVED' | 'CANCELLED'
  supplier: { id: string; name: string }
  items: Array<{
    id: string
    productId: string
    product: { id: string; name: string; sku: string; uom?: { symbol: string } | null }
    quantity: number
    costPrice: number
    totalPrice: number
    createdAt?: string
  }>
  stockTransactions?: Array<{
    productId: string
    type: 'RECEIPT' | 'ISSUE' | 'TRANSFER' | 'ADJUSTMENT'
    quantity: number
  }>
}

const REJECTION_REASONS = ['DAMAGED', 'WRONG_ITEM', 'EXCESS', 'SHORT', 'OTHER'] as const

const itemSchema = z.object({
  itemId: z.string(),
  acceptedQuantity: z.number().min(0, 'Must be ≥ 0'),
  rejectedQuantity: z.number().min(0, 'Must be ≥ 0').default(0),
  reason: z.enum(REJECTION_REASONS).optional(),
  remarks: z.string().optional(),
})

const receiveSchema = z.object({
  receivedDate: z.string().optional(),
  nextExpectedDate: z.string().optional(),
  allowOverReceive: z.boolean().default(false),
  receivedItems: z.array(itemSchema),
  remarks: z.string().optional(),
  warehouseId: z.string().min(1, 'Warehouse is required'),
  zoneId: z.string().optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  manufacturingDate: z.string().optional(),
}).superRefine((data, ctx) => {
  // Require reason when rejectedQuantity > 0
  data.receivedItems.forEach((it, idx) => {
    const rej = Number(it.rejectedQuantity || 0)
    if (rej > 0 && !it.reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Reason required when rejected quantity > 0',
        path: ['receivedItems', idx, 'reason'],
      })
    }
  })
})

type ReceiveForm = z.input<typeof receiveSchema>

interface ReceiveOrderModalProps {
  isOpen: boolean
  onClose: () => void
  purchaseOrder: PurchaseOrder
}

export default function ReceiveOrderModal({ isOpen, onClose, purchaseOrder }: ReceiveOrderModalProps) {
  const queryClient = useQueryClient()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<ReceiveForm>({
    resolver: zodResolver(receiveSchema),
    defaultValues: {
      receivedDate: new Date().toISOString(),
      nextExpectedDate: undefined,
      allowOverReceive: false,
      remarks: '',
      receivedItems: [],
      warehouseId: '',
      zoneId: undefined,
      batchNumber: undefined,
      expiryDate: undefined,
      manufacturingDate: undefined,
    },
  })

  // Fetch warehouses (only STORAGE type and active ones)
  // BUSINESS RULE: Purchase orders can ONLY be received into STORAGE warehouses
  // DISPATCH warehouses are disabled for PO receipt (used for sales only)
  const { data: warehousesData } = useWarehouses({
    isActive: true,
    status: 'ACTIVE',
    limit: 100
  })

  // Filter warehouses to only show STORAGE type
  const warehouses = useMemo(() => {
    const allWarehouses = (warehousesData as any)?.data || []
    return allWarehouses.filter((w: any) => w.warehouseType === 'STORAGE')
  }, [warehousesData])

  // Watch selected warehouse to fetch zones
  const selectedWarehouseId = useWatch({
    control: form.control,
    name: 'warehouseId',
  })

  // Fetch zones for selected warehouse
  const { data: zonesData } = useWarehouseZones(selectedWarehouseId || '')
  const zones = Array.isArray(zonesData) ? zonesData : ((zonesData as any)?.data || [])

  // Load full purchase order with items and stockTransactions
  const { data: detail, isLoading } = useQuery<PurchaseDetail>({
    queryKey: ['purchase-detail', purchaseOrder.id],
    queryFn: async () => {
      const res = await apiClient.get(`/purchase-orders/${purchaseOrder.id}`)
      // Handle wrapped response: { success, message, data: {...} } or direct response
      const responseData = res.data
      if (responseData && typeof responseData === 'object' && 'data' in responseData && !Array.isArray(responseData.data)) {
        return responseData.data
      }
      return responseData
    },
    enabled: isOpen,
  })

  // Compute previously received per product from stockTransactions of type RECEIPT
  const previouslyReceivedByProduct: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {}
    if (!detail?.stockTransactions) return map
    for (const tr of detail.stockTransactions) {
      if (tr.type === 'RECEIPT') {
        map[tr.productId] = (map[tr.productId] || 0) + Number(tr.quantity || 0)
      }
    }
    return map
  }, [detail])

  // Allocate previously received to items with same product in stable order
  const previouslyReceivedByItemId: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {}
    if (!detail?.items) return map
    const byProduct: Record<string, Array<PurchaseDetail['items'][number]>> = {}
    detail.items.forEach((it) => {
      byProduct[it.productId] = byProduct[it.productId] || []
      byProduct[it.productId].push(it)
    })
    Object.entries(byProduct).forEach(([productId, items]) => {
      // Stable order by createdAt then id
      items.sort((a, b) => {
        const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
        if (ta !== tb) return ta - tb
        return a.id.localeCompare(b.id)
      })
      let remaining = previouslyReceivedByProduct[productId] || 0
      for (const it of items) {
        const ordered = Number(it.quantity)
        const alloc = Math.max(0, Math.min(ordered, remaining))
        map[it.id] = alloc
        remaining = Math.max(0, remaining - alloc)
      }
    })
    return map
  }, [detail, previouslyReceivedByProduct])

  // Initialize form items when detail loads
  const itemsView = useMemo(() => {
    if (!detail?.items) return []
    return detail.items.map((it) => {
      const prev = previouslyReceivedByItemId[it.id] || 0
      const remaining = Math.max(0, Number(it.quantity) - prev)
      return {
        id: it.id,
        productName: it.product?.name || 'Unknown',
        sku: it.product?.sku || '',
        uom: it.product?.uom?.symbol || '',
        ordered: Number(it.quantity),
        previouslyReceived: prev,
        remaining,
      }
    })
  }, [detail, previouslyReceivedByItemId])

  // Set form items default when available
  useMemo(() => {
    if (itemsView.length > 0) {
      form.reset({
        receivedDate: new Date().toISOString(),
        allowOverReceive: false,
        remarks: '',
        receivedItems: itemsView.map((row) => ({
          itemId: row.id,
          acceptedQuantity: row.remaining,
          rejectedQuantity: 0,
          reason: undefined,
          remarks: '',
        })),
        warehouseId: form.getValues('warehouseId') || '',
        zoneId: form.getValues('zoneId') || undefined,
        batchNumber: form.getValues('batchNumber') || undefined,
        expiryDate: form.getValues('expiryDate') || undefined,
        manufacturingDate: form.getValues('manufacturingDate') || undefined,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsView.length])

  // Reset zone when warehouse changes
  const handleWarehouseChange = (warehouseId: string) => {
    form.setValue('warehouseId', warehouseId)
    form.setValue('zoneId', undefined) // Reset zone when warehouse changes
  }

  const receiveMutation = useMutation({
    mutationFn: async (payload: ReceiveForm) => {
      return (await apiClient.patch(`/purchase-orders/${purchaseOrder.id}/confirm`, payload)).data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchases'] })
      queryClient.invalidateQueries({ queryKey: ['purchase-detail', purchaseOrder.id] })
      toast.success('Order received successfully')
      onClose()
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to receive order')
    },
  })

  const watchedItems = useWatch({
    control: form.control,
    name: 'receivedItems',
  }) || []
  const allowOverReceive = useWatch({
    control: form.control,
    name: 'allowOverReceive',
  }) ?? false
  const receivedDateValue = useWatch({
    control: form.control,
    name: 'receivedDate',
  })
  const nextExpectedDate = useWatch({
    control: form.control,
    name: 'nextExpectedDate',
  })
  const remarksValue = useWatch({
    control: form.control,
    name: 'remarks',
  })
  const totals = useMemo(() => {
    const items = watchedItems || []
    const accepted = items.reduce((s, it) => s + Number(it?.acceptedQuantity || 0), 0)
    const rejected = items.reduce((s, it) => s + Number(it?.rejectedQuantity || 0), 0)
    const remainingAfter = itemsView.reduce((s, row) => {
      const it = items.find((x) => x?.itemId === row.id)
      const acc = Number(it?.acceptedQuantity || 0)
      const newRemaining = Math.max(0, row.remaining - acc)
      return s + newRemaining
    }, 0)
    return { accepted, rejected, remainingAfter }
  }, [watchedItems, itemsView])

  // When over-receive is not allowed, track rows exceeding remaining
  const overAcceptIds = useMemo(() => {
    const set = new Set<string>()
    if (!itemsView.length || allowOverReceive) return set
    const items = watchedItems || []
    itemsView.forEach((row) => {
      const it = items.find((x) => x.itemId === row.id)
      const acc = Number(it?.acceptedQuantity || 0)
      if (acc > row.remaining) set.add(row.id)
    })
    return set
  }, [watchedItems, itemsView, allowOverReceive])

  const handleSubmit = (data: ReceiveForm) => {
    // Frontend conditional validation for partial receipts
    const anyRemaining = totals.remainingAfter > 0
    if (anyRemaining && !data.nextExpectedDate) {
      toast.error('Next expected date is required for partial receipts')
      return
    }
    if (!data.allowOverReceive) {
      const items = data.receivedItems || []
      const anyOver = itemsView.some((row) => {
        const it = items.find((x) => x.itemId === row.id)
        return Number(it?.acceptedQuantity || 0) > row.remaining
      })
      if (anyOver) {
        toast.error('Accepted quantity exceeds remaining for one or more items. Enable over-receive or adjust quantities.')
        return
      }
    }
    // Clean up payload: convert empty strings and special values to undefined for optional fields
    const payload = {
      ...data,
      zoneId: data.zoneId && data.zoneId !== '__none__' && data.zoneId.trim() !== '' ? data.zoneId : undefined,
      batchNumber: data.batchNumber && data.batchNumber.trim() !== '' ? data.batchNumber : undefined,
      expiryDate: data.expiryDate && data.expiryDate.trim() !== '' ? data.expiryDate : undefined,
      manufacturingDate: data.manufacturingDate && data.manufacturingDate.trim() !== '' ? data.manufacturingDate : undefined,
    }

    setSubmitting(true)
    receiveMutation.mutate(payload, {
      onSettled: () => setSubmitting(false),
    })
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-[96vw] bg-gray-900 border border-gray-700 max-h-[92vh] overflow-y-auto px-2 sm:px-4">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Package className="h-5 w-5" />
            Receive Order
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Order #{purchaseOrder.orderNumber} - {purchaseOrder.supplier?.name ?? '—'}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-gray-300">Loading order details...</div>
        ) : !detail ? (
          <div className="py-8 text-center text-red-400">Failed to load order</div>
        ) : (
          <div className="space-y-6 py-2 sm:py-4">
            {/* Warehouse and Zone Selection (REQUIRED) */}
            <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-4 shadow-lg">
              <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
                <Package className="h-4 w-4" />
                Stock Location (Required)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-gray-300">
                    Warehouse <span className="text-red-400">*</span>
                    <span className="text-xs text-yellow-400 ml-2">(STORAGE only)</span>
                  </Label>
                  <p className="text-xs text-gray-400 mb-2">
                    Purchase orders can only be received into STORAGE warehouses.
                    DISPATCH warehouses are reserved for sales fulfillment.
                  </p>
                  {warehouses.length === 0 && (
                    <div className="bg-red-900/30 border border-red-700 text-red-300 text-xs p-2 rounded mb-2">
                      No STORAGE warehouses available. Please create a STORAGE warehouse first.
                    </div>
                  )}
                  <Controller
                    control={form.control}
                    name="warehouseId"
                    render={({ field, fieldState }) => (
                      <div>
                        <Select
                          value={field.value || ''}
                          onValueChange={(value) => {
                            handleWarehouseChange(value)
                            field.onChange(value)
                          }}
                        >
                          <SelectTrigger className={`bg-gray-700 border-gray-600 text-white ${fieldState.error ? 'border-red-500' : ''}`}>
                            <SelectValue placeholder="Select warehouse" />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-800 border-gray-700">
                            {warehouses.map((warehouse: any) => (
                              <SelectItem key={warehouse.id} value={warehouse.id} className="text-white">
                                {warehouse.name} ({warehouse.code})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {fieldState.error && (
                          <p className="text-xs text-red-400 mt-1">{fieldState.error.message}</p>
                        )}
                      </div>
                    )}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-300">Zone (Optional)</Label>
                  <Controller
                    control={form.control}
                    name="zoneId"
                    render={({ field }) => (
                      <Select
                        value={field.value || '__none__'}
                        onValueChange={(value) => {
                          // Convert special value to undefined
                          field.onChange(value === '__none__' ? undefined : value)
                        }}
                        disabled={!selectedWarehouseId}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white disabled:opacity-50">
                          <SelectValue placeholder={selectedWarehouseId ? "Select zone (optional)" : "Select warehouse first"} />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="__none__" className="text-gray-400">No Zone</SelectItem>
                          {Array.isArray(zones) && zones.map((zone: any) => (
                            <SelectItem key={zone.id} value={zone.id} className="text-white">
                              {zone.name} ({zone.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Dates and options */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-800/70 border border-gray-700 rounded-xl p-4 shadow-lg">
              <div className="space-y-2">
                <Label className="text-gray-300">Delivered on</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Calendar className="h-4 w-4" />
                  </span>
                  <Input
                    type="datetime-local"
                    className="pl-10 bg-gray-700 border-gray-600 text-white"
                    value={
                      receivedDateValue
                        ? format(new Date(receivedDateValue), "yyyy-MM-dd'T'HH:mm")
                        : format(new Date(), "yyyy-MM-dd'T'HH:mm")
                    }
                    onChange={(e) =>
                      form.setValue('receivedDate', new Date(e.target.value).toISOString(), {
                        shouldDirty: true,
                      })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Allow over-receive</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="allowOverReceive"
                    type="checkbox"
                    className="h-4 w-4 accent-green-500"
                    checked={allowOverReceive}
                    onChange={(e) =>
                      form.setValue('allowOverReceive', e.target.checked, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                  />
                  <span className="text-sm text-gray-400">
                    Permit receiving more than remaining quantity
                  </span>
                </div>
              </div>
              {totals.remainingAfter > 0 && (
                <div className="space-y-2">
                  <Label className="text-gray-300">Next expected date (required for partial)</Label>
                  <Input
                    type="date"
                    className="bg-gray-700 border-gray-600 text-white"
                    value={nextExpectedDate || ''}
                    onChange={(e) =>
                      form.setValue('nextExpectedDate', e.target.value, {
                        shouldValidate: true,
                        shouldDirty: true,
                      })
                    }
                  />
                </div>
              )}
            </div>

            {/* Batch details */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-800/70 border border-gray-700 rounded-xl p-4 shadow-lg">
              <div className="space-y-2">
                <Label className="text-gray-300">Batch Number (optional)</Label>
                <Controller
                  control={form.control}
                  name="batchNumber"
                  render={({ field }) => (
                    <Input
                      placeholder="Enter batch number"
                      className="bg-gray-700 border-gray-600 text-white"
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Manufacturing Date (optional)</Label>
                <Controller
                  control={form.control}
                  name="manufacturingDate"
                  render={({ field }) => (
                    <Input
                      type="date"
                      className="bg-gray-700 border-gray-600 text-white"
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Expiry Date (optional)</Label>
                <Controller
                  control={form.control}
                  name="expiryDate"
                  render={({ field }) => (
                    <Input
                      type="date"
                      className="bg-gray-700 border-gray-600 text-white"
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
            </div>

            {!allowOverReceive && overAcceptIds.size > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/30">
                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5" />
                <div className="text-sm text-red-400">
                  One or more items exceed the remaining quantity. Reduce accepted quantities
                  or enable "Allow over-receive" to proceed.
                </div>
              </div>
            )}

            {/* Items table */}
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 shadow-sm">
              <h4 className="text-white font-semibold mb-3">Items</h4>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-300">Product</TableHead>
                      <TableHead className="text-gray-300">Ordered</TableHead>
                      <TableHead className="text-gray-300">Prev. received</TableHead>
                      <TableHead className="text-gray-300">Remaining</TableHead>
                      <TableHead className="text-gray-300">Accept</TableHead>
                      <TableHead className="text-gray-300">Reject</TableHead>
                      <TableHead className="text-gray-300">Reason</TableHead>
                      <TableHead className="text-gray-300">Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsView.map((row, idx) => (
                      <TableRow key={row.id} className="border-gray-700">
                        <TableCell className="text-white">
                          <div className="font-medium">{row.productName}</div>
                          <div className="text-xs text-gray-400">{row.sku}</div>
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {row.ordered} {row.uom}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {row.previouslyReceived}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {row.remaining}
                        </TableCell>
                        <TableCell className="text-white">
                          <Controller
                            control={form.control}
                            name={`receivedItems.${idx}.acceptedQuantity` as const}
                            render={({ field }) => {
                              const value = Number(field.value ?? row.remaining)
                              const isOver = !allowOverReceive && value > row.remaining
                              return (
                                <div>
                                  <input
                                    type="hidden"
                                    {...form.register(`receivedItems.${idx}.itemId` as const)}
                                    value={row.id}
                                  />
                                  <Input
                                    type="number"
                                    min={0}
                                    step="1"
                                    value={value}
                                    className={`bg-gray-700 border-gray-600 text-white w-28 ${isOver ? 'border-red-500 focus:border-red-500' : ''}`}
                                    onChange={(e) => {
                                      const val = e.target.value === '' ? 0 : Number(e.target.value)
                                      field.onChange(val)
                                    }}
                                    aria-invalid={isOver}
                                    title={
                                      isOver ? 'Accepted exceeds remaining; enable over-receive to proceed' : undefined
                                    }
                                  />
                                  {isOver && (
                                    <div className="mt-1 text-xs text-red-400">
                                      Exceeds remaining ({row.remaining}). Enable over-receive or reduce.
                                    </div>
                                  )}
                                </div>
                              )
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-white">
                          <Controller
                            control={form.control}
                            name={`receivedItems.${idx}.rejectedQuantity` as const}
                            render={({ field }) => (
                              <Input
                                type="number"
                                min={0}
                                step="1"
                                value={Number(field.value ?? 0)}
                                className="bg-gray-700 border-gray-600 text-white w-24"
                                onChange={(e) => {
                                  const val = e.target.value === '' ? 0 : Number(e.target.value)
                                  field.onChange(val)
                                }}
                              />
                            )}
                          />
                        </TableCell>
                        <TableCell className="text-white">
                          <Controller
                            control={form.control}
                            name={`receivedItems.${idx}.reason` as const}
                            render={({ field }) => (
                              <Select
                                value={field.value ?? undefined}
                                onValueChange={(value) => {
                                  field.onChange(value)
                                }}
                              >
                                <SelectTrigger className="w-44 bg-gray-700 border-gray-600 text-white">
                                  <SelectValue placeholder="Select reason" />
                                </SelectTrigger>
                                <SelectContent className="bg-gray-800 border-gray-700">
                                  {REJECTION_REASONS.map((r) => (
                                    <SelectItem key={r} value={r} className="text-white">
                                      {r.replace('_', ' ')}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </TableCell>
                        <TableCell className="text-white">
                          <Controller
                            control={form.control}
                            name={`receivedItems.${idx}.remarks` as const}
                            render={({ field }) => (
                              <Input
                                placeholder="Optional remarks"
                                className="bg-gray-700 border-gray-600 text-white"
                                value={field.value ?? ''}
                                onChange={field.onChange}
                              />
                            )}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Notes and summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-2">
                <Label className="text-gray-300">Receipt notes</Label>
                <Textarea
                  placeholder="Optional receipt notes"
                  className="bg-gray-700 border-gray-600 text-white"
                  rows={3}
                  value={remarksValue || ''}
                  onChange={(e) =>
                    form.setValue('remarks', e.target.value, {
                      shouldDirty: true,
                    })
                  }
                />
              </div>
              <div className="space-y-3">
                <div className="p-3 rounded-md bg-gray-700/50 border border-gray-600">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-300">Total accepted</span>
                    <span className="text-white font-medium">{totals.accepted}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-300">Total rejected</span>
                    <span className="text-white font-medium">{totals.rejected}</span>
                  </div>
                  {totals.remainingAfter > 0 && (
                    <div className="flex items-center gap-2 mt-2 p-2 rounded bg-yellow-500/10 border border-yellow-500/30">
                      <AlertCircle className="h-4 w-4 text-yellow-400" />
                      <span className="text-xs text-yellow-400">
                        Partial receipt detected. Next expected date will be required.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={form.handleSubmit(handleSubmit)}
                disabled={submitting || (!allowOverReceive && overAcceptIds.size > 0) || !selectedWarehouseId}
                className="bg-green-600 hover:bg-green-700"
                title={!selectedWarehouseId ? 'Please select a warehouse first' : undefined}
              >
                {submitting ? 'Receiving...' : 'Confirm Receive'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}


