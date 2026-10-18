'use client'

import { useState } from 'react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Package, AlertTriangle } from 'lucide-react'
import { format } from 'date-fns'
import type { Batch } from '@/data/dummy/factory/batches'
import { useBatchesByProduct } from '@/hooks/useBatches'

interface BatchSelection {
  batchId: string
  quantity: number
}

interface BatchSelectorProps {
  productId: string
  warehouseId?: string
  zoneId?: string
  requiredQuantity: number
  selectedBatches: BatchSelection[]
  onSelectionChange: (selections: BatchSelection[]) => void
  disabled?: boolean
}

export function BatchSelector({
  productId,
  warehouseId,
  zoneId,
  requiredQuantity,
  selectedBatches,
  onSelectionChange,
  disabled = false,
}: BatchSelectorProps) {
  const { data: batches = [], isLoading } = useBatchesByProduct(productId, warehouseId, zoneId)
  
  const getRemainingQuantity = () => {
    const selectedTotal = selectedBatches.reduce((sum, s) => sum + s.quantity, 0)
    return Math.max(0, requiredQuantity - selectedTotal)
  }
  
  const handleAddBatch = (batchId: string) => {
    const batch = batches.find((b: Batch) => b.id === batchId)
    if (!batch) return
    
    const remaining = getRemainingQuantity()
    if (remaining <= 0) return
    
    const quantity = Math.min(remaining, batch.availableQuantity)
    
    onSelectionChange([
      ...selectedBatches,
      { batchId, quantity },
    ])
  }
  
  const handleUpdateQuantity = (batchId: string, quantity: number) => {
    const batch = batches.find((b: Batch) => b.id === batchId)
    if (!batch) return
    
    const maxQuantity = batch.availableQuantity
    const clampedQuantity = Math.max(0, Math.min(quantity, maxQuantity))
    
    onSelectionChange(
      selectedBatches.map(s =>
        s.batchId === batchId ? { ...s, quantity: clampedQuantity } : s
      )
    )
  }
  
  const handleRemoveBatch = (batchId: string) => {
    onSelectionChange(selectedBatches.filter(s => s.batchId !== batchId))
  }
  
  const getDaysToExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate)
    const today = new Date()
    const diffTime = expiry.getTime() - today.getTime()
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  }
  
  const availableBatches = batches.filter(
    (b: Batch) => !selectedBatches.some(s => s.batchId === b.id) && b.availableQuantity > 0
  )
  
  const remainingQuantity = getRemainingQuantity()
  
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-gray-500 text-center">Loading batches...</p>
        </CardContent>
      </Card>
    )
  }
  
  return (
    <div className="space-y-4">
      {/* Summary */}
      <Card className="bg-gray-50">
        <CardContent className="pt-4">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Required</p>
              <p className="text-gray-900 font-semibold">{requiredQuantity.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-gray-500">Selected</p>
              <p className="text-green-600 font-semibold">
                {selectedBatches.reduce((sum, s) => sum + s.quantity, 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-gray-500">Remaining</p>
              <p className={`font-semibold ${remainingQuantity > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {remainingQuantity.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Add Batch */}
      {remainingQuantity > 0 && availableBatches.length > 0 && !disabled && (
        <div className="space-y-2">
          <Label>Add Batch (FIFO Order)</Label>
          <Select onValueChange={handleAddBatch}>
            <SelectTrigger>
              <SelectValue placeholder="Select a batch" />
            </SelectTrigger>
            <SelectContent>
              {availableBatches.map((batch: Batch) => {
                const daysToExpiry = getDaysToExpiry(batch.expiryDate)
                return (
                  <SelectItem key={batch.id} value={batch.id}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{batch.batchNumber}</p>
                        <p className="text-xs text-gray-500">
                          Available: {batch.availableQuantity.toLocaleString()} • 
                          Expires: {format(new Date(batch.expiryDate), 'MMM dd, yyyy')}
                          {daysToExpiry <= 30 && (
                            <span className="text-orange-600 ml-1">
                              ({daysToExpiry} days)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
      )}
      
      {/* Selected Batches */}
      {selectedBatches.length > 0 && (
        <div className="space-y-2">
          <Label>Selected Batches</Label>
          <div className="space-y-2">
            {selectedBatches.map((selection) => {
              const batch = batches.find((b: Batch) => b.id === selection.batchId)
              if (!batch) return null
              
              const daysToExpiry = getDaysToExpiry(batch.expiryDate)
              
              return (
                <Card key={selection.batchId} className="border-gray-200">
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="h-4 w-4 text-gray-400 shrink-0" />
                          <p className="font-medium text-gray-900 truncate">{batch.batchNumber}</p>
                          {daysToExpiry <= 30 && (
                            <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">
                              {daysToExpiry} days
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>Expires: {format(new Date(batch.expiryDate), 'MMM dd, yyyy')}</span>
                          </div>
                          <div>
                            <span>Available: {batch.availableQuantity.toLocaleString()}</span>
                          </div>
                        </div>
                        {!disabled && (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min={0}
                              max={batch.availableQuantity}
                              value={selection.quantity}
                              onChange={(e) => handleUpdateQuantity(selection.batchId, Number(e.target.value))}
                              className="w-24"
                            />
                            <span className="text-sm text-gray-500">of {batch.availableQuantity.toLocaleString()}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoveBatch(selection.batchId)}
                              className="text-red-600 hover:text-red-700"
                            >
                              Remove
                            </Button>
                          </div>
                        )}
                        {disabled && (
                          <p className="text-sm text-gray-600">
                            Quantity: <span className="font-semibold">{selection.quantity.toLocaleString()}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}
      
      {/* Warning if insufficient stock */}
      {remainingQuantity > 0 && availableBatches.length === 0 && (
        <div className="flex items-center gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-700">
            Insufficient stock. Need {remainingQuantity.toLocaleString()} more units.
          </p>
        </div>
      )}
    </div>
  )
}

