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
import { useDeleteMachine, type Machine } from '@/hooks/usePlants'
import { Loader2 } from 'lucide-react'

interface DeleteMachineModalProps {
  isOpen: boolean
  onClose: () => void
  machine: Machine | null
  plantId: string
}

export function DeleteMachineModal({
  isOpen,
  onClose,
  machine,
  plantId,
}: DeleteMachineModalProps) {
  const queryClient = useQueryClient()
  const deleteMutation = useDeleteMachine()

  const handleDelete = async () => {
    if (!machine) return

    try {
      await deleteMutation.mutateAsync(machine.id)
      toast.success('Machine deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['machines'] })
      queryClient.invalidateQueries({ queryKey: ['plants', plantId] })
      onClose()
    } catch (error: any) {
      console.error('Error deleting machine:', error)
      toast.error(error.response?.data?.message || 'Failed to delete machine')
    }
  }

  const isLoading = deleteMutation.isPending

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="bg-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gray-900">Delete Machine</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-600">
            Are you sure you want to delete the machine <strong>{machine?.name}</strong> ({machine?.code})?
            <br />
            <br />
            This action cannot be undone.
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

