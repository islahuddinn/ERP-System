'use client'

import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useDeleteWarehouse, type Warehouse } from '@/hooks/useWarehouses'
import { Loader2, AlertTriangle } from 'lucide-react'

interface DeleteWarehouseModalProps {
  isOpen: boolean
  onClose: () => void
  warehouse: Warehouse | null
}

export function DeleteWarehouseModal({
  isOpen,
  onClose,
  warehouse,
}: DeleteWarehouseModalProps) {
  const queryClient = useQueryClient()
  const deleteMutation = useDeleteWarehouse()

  const handleDelete = async () => {
    if (!warehouse) return

    try {
      await deleteMutation.mutateAsync(warehouse.id)
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      toast.success('Warehouse deleted successfully')
      onClose()
    } catch (error: any) {
      console.error('Error deleting warehouse:', error)
      toast.error(error.response?.data?.message || 'Failed to delete warehouse')
    }
  }

  const isLoading = deleteMutation.isPending

  if (!warehouse) return null

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-white">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <AlertDialogTitle className="text-gray-900 text-lg font-semibold">
                Delete Warehouse
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600 mt-1">
                This action cannot be undone.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="py-4">
          <p className="text-gray-700 mb-4">
            Are you sure you want to delete <span className="font-semibold text-gray-900">{warehouse.name}</span>?
          </p>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-red-900 mb-2">Impact Analysis:</h4>
            <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
              <li>All zones in this warehouse will be deleted</li>
              <li>All stock balances will be removed</li>
              <li>All capacity alerts will be deleted</li>
              <li>All batches associated with this warehouse will be affected</li>
            </ul>
          </div>
        </div>

        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel
            disabled={isLoading}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Warehouse'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

