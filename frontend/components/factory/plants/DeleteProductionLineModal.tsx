'use client'

import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useDeleteProductionLine, type ProductionLine } from '@/hooks/usePlants'
import { Loader2 } from 'lucide-react'

interface DeleteProductionLineModalProps {
  isOpen: boolean
  onClose: () => void
  line: ProductionLine | null
  plantId: string
}

export function DeleteProductionLineModal({
  isOpen,
  onClose,
  line,
  plantId,
}: DeleteProductionLineModalProps) {
  const queryClient = useQueryClient()
  const deleteMutation = useDeleteProductionLine()

  const handleDelete = async () => {
    if (!line) return

    try {
      await deleteMutation.mutateAsync(line.id)
      toast.success('Production line deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['production-lines'] })
      queryClient.invalidateQueries({ queryKey: ['plants', plantId] })
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      onClose()
    } catch (error: any) {
      console.error('Error deleting production line:', error)
      toast.error(error.response?.data?.message || 'Failed to delete production line')
    }
  }

  const isLoading = deleteMutation.isPending

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gray-900">Delete Production Line</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-600">
            Are you sure you want to delete the production line <strong>{line?.name}</strong> ({line?.code})?
            <br />
            <br />
            This action will also delete all machines associated with this production line and cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
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
              'Delete'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

