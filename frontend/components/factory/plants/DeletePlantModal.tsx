'use client'

import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { useDeletePlant, type Plant } from '@/hooks/usePlants'
import { Loader2, AlertTriangle } from 'lucide-react'

interface DeletePlantModalProps {
  isOpen: boolean
  onClose: () => void
  plant: Plant | null
}

export function DeletePlantModal({
  isOpen,
  onClose,
  plant,
}: DeletePlantModalProps) {
  const queryClient = useQueryClient()
  const deleteMutation = useDeletePlant()

  const handleDelete = async () => {
    if (!plant) return

    try {
      await deleteMutation.mutateAsync(plant.id)
      queryClient.invalidateQueries({ queryKey: ['plants'] })
      toast.success('Plant deleted successfully')
      onClose()
    } catch (error: any) {
      console.error('Error deleting plant:', error)
      toast.error(error.response?.data?.message || 'Failed to delete plant')
    }
  }

  const isLoading = deleteMutation.isPending

  if (!plant) return null

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
                Delete Plant
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-600 mt-1">
                This action cannot be undone.
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="py-4">
          <p className="text-gray-700 mb-4">
            Are you sure you want to delete <span className="font-semibold text-gray-900">{plant.name}</span>?
          </p>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-red-900 mb-2">Impact Analysis:</h4>
            <ul className="text-sm text-red-800 space-y-1 list-disc list-inside">
              <li>All production lines in this plant will be affected</li>
              <li>All machines associated with this plant will be affected</li>
              <li>All work orders linked to this plant will be affected</li>
              <li>All production orders will be impacted</li>
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
              'Delete Plant'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

