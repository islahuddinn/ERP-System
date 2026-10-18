'use client'

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { apiClient } from '@/lib/api-client'
import { AlertTriangle, CheckCircle, Loader2, Calendar, User } from 'lucide-react'
import { useState } from 'react'
import type { CapacityAlert } from '@/hooks/useWarehouses'
import { getDummyDataStore } from '@/hooks/useWarehouses'
import { userResolver } from '@/lib/user-resolver'
import { isDummyDataEnabled } from '@/lib/dummy-data'

// Set to true to use dummy data (frontend-only mode)
const USE_DUMMY_DATA = isDummyDataEnabled()

interface CapacityAlertDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  alert: CapacityAlert | null
  warehouseId: string
}

export function CapacityAlertDetailsModal({
  isOpen,
  onClose,
  alert,
  warehouseId,
}: CapacityAlertDetailsModalProps) {
  const queryClient = useQueryClient()
  const [isResolving, setIsResolving] = useState(false)

  const resolveAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      if (USE_DUMMY_DATA) {
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // Update dummy data
        const store = getDummyDataStore()
        const alerts = store.alerts.get(warehouseId) || []
        const alertIndex = alerts.findIndex(a => a.id === alertId)
        
        if (alertIndex !== -1) {
          alerts[alertIndex] = {
            ...alerts[alertIndex],
            isResolved: true,
            resolvedAt: new Date().toISOString(),
            resolvedById: 'user-1',
          }
          store.alerts.set(warehouseId, alerts)
        }
        
        return { success: true }
      }
      
      const response = await apiClient.post(`/warehouses/${warehouseId}/capacity/alerts/${alertId}/resolve`, {})
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['warehouse-alerts', warehouseId] })
      queryClient.invalidateQueries({ queryKey: ['warehouse-capacity-alerts', warehouseId] })
      queryClient.invalidateQueries({ queryKey: ['warehouse', warehouseId] })
      toast.success('Alert resolved successfully')
      setIsResolving(false)
      onClose()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to resolve alert')
      setIsResolving(false)
    },
  })

  const handleResolve = async () => {
    if (!alert) return
    setIsResolving(true)
    await resolveAlertMutation.mutateAsync(alert.id)
  }

  const getAlertLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      NORMAL: 'bg-green-50 text-green-700 border-green-200',
      WARNING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      CRITICAL: 'bg-orange-50 text-orange-700 border-orange-200',
      FULL: 'bg-red-50 text-red-700 border-red-200',
    }
    return colors[level] || 'bg-gray-50 text-gray-700 border-gray-200'
  }

  if (!alert) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-white">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${
              alert.alertLevel === 'FULL' || alert.alertLevel === 'CRITICAL' 
                ? 'bg-red-100' 
                : alert.alertLevel === 'WARNING'
                ? 'bg-yellow-100'
                : 'bg-green-100'
            }`}>
              <AlertTriangle className={`h-5 w-5 ${
                alert.alertLevel === 'FULL' || alert.alertLevel === 'CRITICAL'
                  ? 'text-red-600'
                  : alert.alertLevel === 'WARNING'
                  ? 'text-yellow-600'
                  : 'text-green-600'
              }`} />
            </div>
            <div>
              <DialogTitle className="text-gray-900 text-lg font-semibold">
                Capacity Alert Details
              </DialogTitle>
              <DialogDescription className="text-gray-600 mt-1">
                View and manage capacity alert information
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Alert Level Badge */}
          <div className="flex items-center gap-3">
            <Badge className={`${getAlertLevelColor(alert.alertLevel)} text-sm font-semibold px-3 py-1`}>
              {alert.alertLevel}
            </Badge>
            {alert.zone && (
              <span className="text-sm text-gray-600">
                Zone: <span className="font-medium text-gray-900">{alert.zone.name}</span> ({alert.zone.code})
              </span>
            )}
          </div>

          {/* Alert Message */}
          {alert.message && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-1">Message:</p>
              <p className="text-sm text-gray-600">{alert.message}</p>
            </div>
          )}

          {/* Capacity Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Current Capacity</p>
              <p className="text-2xl font-bold text-gray-900">{alert.currentCapacity.toFixed(2)}%</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Threshold</p>
              <p className="text-2xl font-bold text-gray-900">{alert.threshold.toFixed(2)}%</p>
            </div>
          </div>

          {/* Capacity Breakdown */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Used Capacity</p>
              <p className="text-xl font-semibold text-orange-600">{alert.currentUsed.toFixed(2)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Available Capacity</p>
              <p className="text-xl font-semibold text-green-600">{alert.currentAvailable.toFixed(2)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-1">Total Capacity</p>
              <p className="text-xl font-semibold text-gray-900">
                {(alert.currentUsed + alert.currentAvailable).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Timeline */}
          <div className="border-t border-gray-200 pt-4 space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-gray-400" />
              <div>
                <p className="text-gray-600">Created</p>
                <p className="text-gray-900 font-medium">
                  {new Date(alert.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
            {alert.isResolved && alert.resolvedAt && (
              <div className="flex items-center gap-3 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <div>
                  <p className="text-gray-600">Resolved</p>
                  <p className="text-gray-900 font-medium">
                    {new Date(alert.resolvedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
            {alert.resolvedById && (
              <div className="flex items-center gap-3 text-sm">
                <User className="h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-gray-600">Resolved By</p>
                  <p className="text-gray-900 font-medium">
                    {userResolver.getUserName(alert.resolvedById)} ({userResolver.getUserEmail(alert.resolvedById)})
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-4 border-t border-gray-200">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isResolving}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Close
          </Button>
          {!alert.isResolved && (
            <Button
              onClick={handleResolve}
              disabled={isResolving}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isResolving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resolving...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Resolve Alert
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

