'use client'

import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useUpdateBatch, type Batch } from '@/hooks/useBatches'
import { Loader2 } from 'lucide-react'
import { format } from 'date-fns'

interface EditBatchModalProps {
  isOpen: boolean
  onClose: () => void
  batch: Batch | null
}

export function EditBatchModal({ isOpen, onClose, batch }: EditBatchModalProps) {
  const queryClient = useQueryClient()
  const updateMutation = useUpdateBatch()
  
  // Normalize batch data to handle both API and dummy data formats
  // API might return: quantity, availableQty, consumedQuantity
  // Dummy data has: totalQuantity, availableQuantity, consumedQuantity
  const totalQuantity = batch ? ((batch as any).totalQuantity ?? (batch as any).quantity ?? 0) : 0
  const availableQuantity = batch ? ((batch as any).availableQuantity ?? (batch as any).availableQty ?? 0) : 0
  const consumedQuantity = batch ? ((batch as any).consumedQuantity ?? 0) : 0
  
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<{
    qualityStatus?: 'PASSED' | 'FAILED' | 'PENDING' | 'CONDITIONAL'
    notes?: string
    expiryDate?: string
  }>({
    defaultValues: {
      qualityStatus: undefined,
      notes: '',
      expiryDate: '',
    },
  })
  
  useEffect(() => {
    if (batch) {
      reset({
        qualityStatus: batch.qualityStatus,
        notes: batch.notes || '',
        expiryDate: batch.expiryDate ? format(new Date(batch.expiryDate), 'yyyy-MM-dd') : '',
      })
    }
  }, [batch, reset])
  
  const onSubmit = async (data: any) => {
    if (!batch) return
    
    try {
      await updateMutation.mutateAsync({
        id: batch.id,
        data: {
          qualityStatus: data.qualityStatus || undefined,
          notes: data.notes || undefined,
          expiryDate: data.expiryDate ? new Date(data.expiryDate).toISOString() : undefined,
        },
      })
      
      toast.success('Batch updated successfully')
      onClose()
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update batch')
    }
  }
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Batch</DialogTitle>
          <DialogDescription>
            Update batch information for {batch?.batchNumber}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Batch Number</Label>
            <Input
              value={batch?.batchNumber || ''}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500">Batch number cannot be changed</p>
          </div>
          
          <div className="space-y-2">
            <Label>Product</Label>
            <Input
              value={batch?.product?.name || ''}
              disabled
              className="bg-gray-50"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Expiry Date</Label>
            <Input
              type="date"
              {...register('expiryDate')}
              className={errors.expiryDate ? 'border-red-300' : ''}
            />
            {errors.expiryDate && (
              <p className="text-xs text-red-600">{errors.expiryDate.message}</p>
            )}
          </div>
          
          <div className="space-y-2">
            <Label>Quality Status</Label>
            <Select
              value={watch('qualityStatus') || 'none'}
              onValueChange={(value) => setValue('qualityStatus', value === 'none' ? undefined : value as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select quality status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Status</SelectItem>
                <SelectItem value="PASSED">Passed</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="CONDITIONAL">Conditional</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              {...register('notes')}
              placeholder="Add notes about this batch..."
              rows={4}
              className={errors.notes ? 'border-red-300' : ''}
            />
            {errors.notes && (
              <p className="text-xs text-red-600">{errors.notes.message}</p>
            )}
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Current Quantities (Read-only)</p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Total</p>
                <p className="text-gray-900 font-semibold">{totalQuantity.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500">Available</p>
                <p className="text-green-600 font-semibold">{availableQuantity.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-gray-500">Consumed</p>
                <p className="text-gray-600 font-semibold">{consumedQuantity.toLocaleString()}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Quantities are managed through stock transactions</p>
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={updateMutation.isPending}
              className="factory-button-secondary"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="factory-button-primary"
            >
              {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Batch
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

