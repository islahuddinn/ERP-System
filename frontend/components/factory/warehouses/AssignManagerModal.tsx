'use client'

import React, { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAssignWarehouseManager, useRemoveWarehouseManager, type Warehouse } from '@/hooks/useWarehouses'
import { Loader2, User } from 'lucide-react'

interface AssignManagerModalProps {
  isOpen: boolean
  onClose: () => void
  warehouse: Warehouse | null
  users: Array<{ id: string; name: string; email: string }>
}

export function AssignManagerModal({
  isOpen,
  onClose,
  warehouse,
  users,
}: AssignManagerModalProps) {
  const queryClient = useQueryClient()
  const assignMutation = useAssignWarehouseManager()
  const removeMutation = useRemoveWarehouseManager()
  const [selectedManagerId, setSelectedManagerId] = useState<string>('none')

  useEffect(() => {
    if (warehouse) {
      setSelectedManagerId(warehouse.managerId || 'none')
    }
  }, [warehouse])

  const handleSubmit = async () => {
    if (!warehouse) return

    try {
      if (selectedManagerId === 'none') {
        await removeMutation.mutateAsync(warehouse.id)
        toast.success('Manager removed successfully')
      } else {
        await assignMutation.mutateAsync({ id: warehouse.id, managerId: selectedManagerId })
        toast.success('Manager assigned successfully')
      }
      queryClient.invalidateQueries({ queryKey: ['warehouse', warehouse.id] })
      queryClient.invalidateQueries({ queryKey: ['warehouses'] })
      onClose()
    } catch (error: any) {
      console.error('Error assigning manager:', error)
      toast.error(error.response?.data?.message || 'Failed to assign manager')
    }
  }

  const isLoading = assignMutation.isPending || removeMutation.isPending

  if (!warehouse) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md bg-white">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <User className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <DialogTitle className="text-gray-900 text-lg font-semibold">
                Assign Manager
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-1">
                Assign a manager to {warehouse.name}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="manager" className="text-gray-700 font-medium">Select Manager</Label>
            <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
              <SelectTrigger className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                <SelectValue placeholder="Select manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Remove Manager)</SelectItem>
                {Array.isArray(users) && users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {warehouse.manager && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
              <p className="text-sm text-gray-600 mb-1">Current Manager:</p>
              <p className="text-sm font-medium text-gray-900">
                {warehouse.manager.name} ({warehouse.manager.email})
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Assign Manager'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

