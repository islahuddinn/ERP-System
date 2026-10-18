'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'react-hot-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { apiClient } from '@/lib/api-client'
import { PaymentMethod, useCreateSaleReturn, useReturnableItems } from '@/hooks/pos/useReturns'
import { ArrowLeft, Loader2, Search, Undo2 } from 'lucide-react'

interface SaleItem {
  id: string
  itemName: string
  itemType: 'PRODUCT' | 'SERVICE'
  quantity: number
  sku?: string
  product?: {
    id: string
    name: string
  }
  lineSubtotal: number
  itemTaxAmount: number
  itemDiscountAmount: number
  lineTotal: number
}

interface SaleDetails {
  id: string
  saleNumber: string
  saleDate: string
  status: string
  paymentStatus: string
  totalAmount: number
  amountPaid: number
  customer?: {
    id: string
    name: string
    email?: string
    phone?: string
  }
  location: {
    id: string
    name: string
  }
  saleItems: SaleItem[]
}

import { formatCurrency } from '@/lib/currency';

const PAYMENT_METHODS: PaymentMethod[] = ['CASH', 'CARD', 'MOBILE_PAYMENT', 'BANK_TRANSFER', 'CHEQUE', 'OTHER', 'CREDIT']

export default function CreateSaleReturnPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [saleNumberInput, setSaleNumberInput] = useState('')
  const [isSearchingSale, setIsSearchingSale] = useState(false)
  const [selectedSale, setSelectedSale] = useState<SaleDetails | null>(null)
  const [reason, setReason] = useState('')
  const [notes, setNotes] = useState('')
  const [refundMethod, setRefundMethod] = useState<PaymentMethod>('CASH')
  const [quantities, setQuantities] = useState<Record<string, number | ''>>({})
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  const { data: returnableItems, isLoading: isLoadingReturnable } = useReturnableItems(selectedSale?.id)
  const createSaleReturn = useCreateSaleReturn()

  const loadSaleById = useCallback(async (saleId: string) => {
    try {
      setIsSearchingSale(true)
      const detailResponse = await apiClient.get(`/pos/sales/${saleId}`)
      const detailedSale = detailResponse.data as SaleDetails
      setSelectedSale(detailedSale)
      setSaleNumberInput(detailedSale.saleNumber)
      setRefundMethod('CASH')
      setReason('')
      setNotes('')
      toast.success(`Loaded sale ${detailedSale.saleNumber}`)
    } catch (error: any) {
      console.error(error)
      const message = error.response?.data?.message || 'Failed to fetch sale'
      toast.error(message)
      // If sale not found, clear the saleId from URL
      router.replace('/dashboard/pos/returns/create')
    } finally {
      setIsSearchingSale(false)
    }
  }, [router])

  // Load sale from URL parameter on mount
  useEffect(() => {
    const saleId = searchParams.get('saleId')
    if (saleId && isInitialLoad) {
      setIsInitialLoad(false)
      loadSaleById(saleId)
    }
  }, [searchParams, isInitialLoad, loadSaleById])

  useEffect(() => {
    if (returnableItems) {
      const initial: Record<string, number | ''> = {}
      returnableItems.forEach((item) => {
        initial[item.saleItemId] = 0
      })
      setQuantities(initial)
    }
  }, [returnableItems])

  const handleFindSale = async () => {
    if (!saleNumberInput.trim()) {
      toast.error('Enter a sale number first')
      return
    }
    try {
      setIsSearchingSale(true)
      const listResponse = await apiClient.get('/pos/sales', {
        params: {
          saleNumber: saleNumberInput.trim(),
          page: 1,
          limit: 1,
        },
      })
      const saleData = listResponse.data?.data?.[0]
      if (!saleData) {
        toast.error('No sale found with that number')
        setSelectedSale(null)
        return
      }
      const detailResponse = await apiClient.get(`/pos/sales/${saleData.id}`)
      const detailedSale = detailResponse.data as SaleDetails
      setSelectedSale(detailedSale)
      setRefundMethod('CASH')
      setReason('')
      setNotes('')
      toast.success(`Loaded sale ${detailedSale.saleNumber}`)
    } catch (error: any) {
      console.error(error)
      const message = error.response?.data?.message || 'Failed to fetch sale'
      toast.error(message)
    } finally {
      setIsSearchingSale(false)
    }
  }

  const handleResetSale = () => {
    setSelectedSale(null)
    setQuantities({})
    setReason('')
    setNotes('')
    setSaleNumberInput('')
    setIsInitialLoad(true)
    // Clear saleId from URL
    router.replace('/dashboard/pos/returns/create')
  }

  const selectedItems = useMemo(() => {
    if (!selectedSale) return []
    return selectedSale.saleItems
      .map((item) => ({
        ...item,
        selectedQuantity: Number(quantities[item.id]) || 0,
      }))
      .filter((item) => item.selectedQuantity > 0)
  }, [quantities, selectedSale])

  const totals = useMemo(() => {
    if (!selectedSale) {
      return { subtotal: 0, tax: 0, discount: 0, total: 0 }
    }

    return selectedSale.saleItems.reduce(
      (acc, item) => {
        const qty = Number(quantities[item.id]) || 0
        if (qty <= 0) {
          return acc
        }
        const originalQty = Number(item.quantity)
        if (!originalQty) {
          return acc
        }
        const ratio = qty / originalQty
        return {
          subtotal: acc.subtotal + Number(item.lineSubtotal || 0) * ratio,
          tax: acc.tax + Number(item.itemTaxAmount || 0) * ratio,
          discount: acc.discount + Number(item.itemDiscountAmount || 0) * ratio,
          total: acc.total + Number(item.lineTotal || 0) * ratio,
        }
      },
      { subtotal: 0, tax: 0, discount: 0, total: 0 },
    )
  }, [quantities, selectedSale])

  const handleQuantityChange = (saleItemId: string, value: string, max: number) => {
    if (value === '') {
      setQuantities((prev) => ({ ...prev, [saleItemId]: '' }))
      return
    }
    const numeric = Number(value)
    if (Number.isNaN(numeric) || numeric < 0) return
    const safeValue = Math.min(numeric, max)
    setQuantities((prev) => ({ ...prev, [saleItemId]: safeValue }))
  }

  const handleSubmit = () => {
    if (!selectedSale) {
      toast.error('Select a sale first')
      return
    }
    if (selectedItems.length === 0) {
      toast.error('Select at least one item to return')
      return
    }
    if (!reason.trim()) {
      toast.error('Reason is required')
      return
    }
    const payload = {
      items: selectedItems.map((item) => ({
        originalSaleItemId: item.id,
        quantityReturned: Number(item.selectedQuantity),
      })),
      reason: reason.trim(),
      notes: notes.trim() || undefined,
      refundMethod,
    }
    createSaleReturn.mutate(
      { saleId: selectedSale.id, data: payload },
      {
        onSuccess: () => {
          router.push('/dashboard/pos/returns')
        },
      },
    )
  }

  const disableSubmit = !selectedSale || selectedItems.length === 0 || totals.total <= 0 || !reason.trim()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()} className="text-gray-400 hover:text-white">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white">Create Sale Return</h1>
          <p className="text-gray-400">Follow the same workflow as purchase returns for POS sales.</p>
        </div>
        <Link href="/dashboard/pos/returns" className="ml-auto">
          <Button variant="outline" className="border-gray-600 text-gray-200 hover:text-white">
            <Undo2 className="mr-2 h-4 w-4" />
            Sale Return List
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-white">Find sale</CardTitle>
          <CardDescription className="text-gray-400">
            Enter a sale number to load its details and returnable items.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 md:flex-row">
            <Input
              placeholder="POS-20231115-0004"
              value={saleNumberInput}
              onChange={(event) => setSaleNumberInput(event.target.value.toUpperCase())}
              className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
            />
            <div className="flex gap-2">
              <Button onClick={handleFindSale} disabled={isSearchingSale}>
                {isSearchingSale ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                Find sale
              </Button>
              {selectedSale && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleResetSale}
                  className="border-gray-600 text-gray-200 hover:text-white"
                >
                  Reset
                </Button>
              )}
            </div>
          </div>

          {selectedSale && (
            <div className="grid gap-4 rounded-lg border border-gray-700 bg-gray-900/40 p-4 md:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium text-gray-300">Sale information</h4>
                <div className="mt-2 space-y-1 text-sm text-gray-200">
                  <p>
                    <span className="text-gray-400">Sale #:</span>{' '}
                    <span className="font-semibold">{selectedSale.saleNumber}</span>
                  </p>
                  <p>
                    <span className="text-gray-400">Date:</span>{' '}
                    {new Date(selectedSale.saleDate).toLocaleString()}
                  </p>
                  <p>
                    <span className="text-gray-400">Location:</span> {selectedSale.location.name}
                  </p>
                  <p>
                    <span className="text-gray-400">Customer:</span>{' '}
                    {selectedSale.customer?.name ?? 'Walk-in'}
                  </p>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-300">Totals</h4>
                <div className="mt-2 space-y-1 text-sm text-gray-200">
                  <p>
                    <span className="text-gray-400">Sale total:</span>{' '}
                    {formatCurrency(Number(selectedSale.totalAmount || 0))}
                  </p>
                  <p>
                    <span className="text-gray-400">Paid:</span>{' '}
                    {formatCurrency(Number(selectedSale.amountPaid || 0))}
                  </p>
                  <div className="flex gap-2">
                    <Badge variant="secondary">{selectedSale.status}</Badge>
                    <Badge variant="outline">{selectedSale.paymentStatus}</Badge>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedSale && (
        <Card>
          <CardHeader>
            <CardTitle className="text-white">Returnable items</CardTitle>
            <CardDescription className="text-gray-400">
              Select quantities to return. Stock will be restored automatically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingReturnable ? (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading returnable items...
              </div>
            ) : returnableItems && returnableItems.length > 0 ? (
              <div className="rounded-xl border border-gray-700">
                <Table>
                  <TableHeader>
                    <TableRow className="border-gray-700">
                      <TableHead className="text-gray-300">Item</TableHead>
                      <TableHead className="text-right text-gray-300">Ordered</TableHead>
                      <TableHead className="text-right text-gray-300">Already returned</TableHead>
                      <TableHead className="text-right text-gray-300">Available</TableHead>
                      <TableHead className="text-right text-gray-300">Return qty</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {returnableItems.map((item) => {
                      const saleItem = selectedSale.saleItems.find((saleItem) => saleItem.id === item.saleItemId)
                      const max = Number(item.returnableQuantity || 0)
                      const currentValue = quantities[item.saleItemId]
                      const displayValue =
                        currentValue === '' ? '' : typeof currentValue === 'number' ? currentValue : ''
                      return (
                        <TableRow key={item.saleItemId} className="border-gray-700">
                          <TableCell className="text-white">
                            <div className="font-medium">{item.itemName}</div>
                            <div className="text-xs text-gray-400">
                              {item.itemType} {saleItem?.sku ? `• ${saleItem.sku}` : ''}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-gray-100">{Number(item.originalQuantity)}</TableCell>
                          <TableCell className="text-right text-gray-400">
                            {Number(item.returnedQuantity)}
                          </TableCell>
                          <TableCell className="text-right font-medium text-white">{max}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-2">
                              <Input
                                type="number"
                                min={0}
                                step={0.001}
                                max={max}
                                value={displayValue}
                                onChange={(event) => handleQuantityChange(item.saleItemId, event.target.value, max)}
                                className="h-9 w-28 bg-gray-700 border-gray-600 text-white"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleQuantityChange(item.saleItemId, String(max), max)}
                                className="border-gray-600 text-gray-200 hover:text-white"
                              >
                                Max
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-gray-400">
                All items from this sale have already been returned or are not eligible.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {selectedSale && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-white">Return summary</CardTitle>
              <CardDescription className="text-gray-400">
                Calculated automatically based on selected quantities.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-gray-300">
                <span>Subtotal</span>
                <span className="font-medium text-white">{formatCurrency(totals.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span>Tax</span>
                <span className="font-medium text-white">{formatCurrency(totals.tax)}</span>
              </div>
              <div className="flex items-center justify-between text-gray-300">
                <span>Discount</span>
                <span className="font-medium text-white">-{formatCurrency(totals.discount)}</span>
              </div>
              <div className="flex items-center justify-between text-base font-semibold text-white">
                <span>Refund amount</span>
                <span>{formatCurrency(totals.total)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-white">Return details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason" className="text-gray-300">
                  Reason
                </Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  placeholder="Explain why the customer is returning the items..."
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-gray-300">
                  Internal notes
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Optional notes for this return (visible to staff only)"
                  className="bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Refund method</Label>
                <Select value={refundMethod} onValueChange={(value) => setRefundMethod(value as PaymentMethod)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem key={method} value={method}>
                        {method}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex items-center justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => router.push('/dashboard/pos/returns')}
          className="border-gray-600 text-gray-200 hover:text-white"
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={disableSubmit || createSaleReturn.isPending}
        >
          {createSaleReturn.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Submit return
        </Button>
      </div>
    </div>
  )
}

