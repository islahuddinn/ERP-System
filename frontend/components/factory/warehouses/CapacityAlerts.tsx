'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { useState } from 'react'
import { getDummyDataStore } from '@/hooks/useWarehouses'
import { toast } from 'react-hot-toast'
import { userResolver } from '@/lib/user-resolver'
import { isDummyDataEnabled } from '@/lib/dummy-data'

// Set to true to use dummy data (frontend-only mode)
const USE_DUMMY_DATA = isDummyDataEnabled()

interface CapacityAlert {
  id: string
  warehouseId: string
  zoneId?: string
  alertLevel: 'NORMAL' | 'WARNING' | 'CRITICAL' | 'FULL'
  currentCapacity: number
  currentUsed: number
  currentAvailable: number
  threshold: number
  message?: string
  isResolved: boolean
  resolvedById?: string
  resolvedAt?: string
  createdAt: string
  zone?: {
    id: string
    name: string
    code: string
  }
}

interface CapacityAlertsProps {
  alerts: CapacityAlert[]
  isLoading: boolean
  warehouseId: string
}

export function CapacityAlerts({ alerts, isLoading, warehouseId }: CapacityAlertsProps) {
  const queryClient = useQueryClient()
  const [resolvingAlertId, setResolvingAlertId] = useState<string | null>(null)

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
      setResolvingAlertId(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to resolve alert')
      setResolvingAlertId(null)
    },
  })

  const handleResolveAlert = async (alertId: string) => {
    setResolvingAlertId(alertId)
    await resolveAlertMutation.mutateAsync(alertId)
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

  const getAlertIcon = (level: string) => {
    if (level === 'FULL' || level === 'CRITICAL') {
      return <AlertTriangle className="h-5 w-5 text-red-600" />
    }
    if (level === 'WARNING') {
      return <AlertTriangle className="h-5 w-5 text-yellow-600" />
    }
    return <CheckCircle className="h-5 w-5 text-green-600" />
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!alerts || alerts.length === 0) {
    return (
      <div className="text-center py-12">
        <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-900 font-medium">No active alerts</p>
        <p className="text-sm text-gray-500 mt-2">All capacity levels are within normal thresholds</p>
      </div>
    )
  }

  // Filter to show only unresolved alerts by default
  const activeAlerts = alerts.filter(alert => !alert.isResolved)
  const resolvedAlerts = alerts.filter(alert => alert.isResolved)

  return (
    <div className="space-y-4">
      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Alerts ({activeAlerts.length})</h3>
          <div className="space-y-4">
            {activeAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${getAlertLevelColor(alert.alertLevel)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    {getAlertIcon(alert.alertLevel)}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getAlertLevelColor(alert.alertLevel)}>
                          {alert.alertLevel}
                        </Badge>
                        {alert.zone && (
                          <span className="text-sm text-gray-600">Zone: {alert.zone.name}</span>
                        )}
                      </div>
                      {alert.message && (
                        <p className="text-sm text-gray-700 mb-3">{alert.message}</p>
                      )}
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Current Capacity</p>
                          <p className="text-gray-900 font-semibold">{alert.currentCapacity.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Threshold</p>
                          <p className="text-gray-900 font-semibold">{alert.threshold.toFixed(2)}%</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Created</p>
                          <p className="text-gray-900 font-semibold">
                            {new Date(alert.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                        <div>
                          <p className="text-gray-600">Used</p>
                          <p className="text-gray-900 font-semibold">{alert.currentUsed.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-gray-600">Available</p>
                          <p className="text-gray-900 font-semibold">{alert.currentAvailable.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleResolveAlert(alert.id)}
                    disabled={resolvingAlertId === alert.id}
                    className="ml-4 factory-button-secondary"
                  >
                    {resolvingAlertId === alert.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Resolve
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resolved Alerts */}
      {resolvedAlerts.length > 0 && (
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-gray-600 mb-4">Resolved Alerts ({resolvedAlerts.length})</h3>
          <div className="space-y-2">
            {resolvedAlerts.map((alert) => (
              <div
                key={alert.id}
                className="p-3 rounded-lg border border-gray-200 bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="bg-gray-100 text-gray-600 border-gray-200">
                          {alert.alertLevel} (Resolved)
                        </Badge>
                        {alert.zone && (
                          <span className="text-sm text-gray-600">Zone: {alert.zone.name}</span>
                        )}
                      </div>
                      {alert.message && (
                        <p className="text-sm text-gray-600 mt-1">{alert.message}</p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      Resolved: {alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleDateString() : 'N/A'}
                    </p>
                    {alert.resolvedById && (
                      <p className="text-xs text-gray-500">By: {userResolver.getUserName(alert.resolvedById)}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
