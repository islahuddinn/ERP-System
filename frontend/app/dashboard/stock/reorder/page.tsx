'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api-client'
import { AlertTriangle, Package, MapPin, RefreshCw, Clock } from 'lucide-react'
import { useState, useEffect } from 'react'

export default function ReorderPage() {
  const queryClient = useQueryClient()
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const { data: alerts, isLoading, error: alertsError, isFetching } = useQuery({
    queryKey: ['reorder-alerts'],
    queryFn: async () => {
      const { data } = await apiClient.get('/reorder/alerts')
      const payload = data?.data ?? data
      return Array.isArray(payload) ? payload : []
    },
    retry: 3,
    retryDelay: 1000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  })

  const { data: summary, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['reorder-summary'],
    queryFn: async () => {
      const { data } = await apiClient.get('/reorder/summary')
      return data?.data ?? data
    },
    retry: 3,
    retryDelay: 1000,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  })

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['reorder-alerts'] })
    queryClient.invalidateQueries({ queryKey: ['reorder-summary'] })
    setLastUpdated(new Date())
  }

  // Update last updated time when data changes
  useEffect(() => {
    if (alerts && !isLoading) {
      setLastUpdated(new Date())
    }
  }, [alerts, isLoading])

  if (isLoading || summaryLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (alertsError || summaryError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Error Loading Reorder Alerts</h3>
          <p className="text-gray-300 mb-4">
            {alertsError?.message || summaryError?.message || 'Unable to load reorder data'}
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Reorder Alerts</h1>
            <p className="mt-1 text-lg text-gray-300">
              Products that need restocking
              {isFetching && <span className="ml-2 text-blue-500">• Auto-refreshing...</span>}
              {lastUpdated && !isFetching && (
                <span className="ml-2 text-gray-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <Button 
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            disabled={isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Total Alerts</p>
                <p className="text-2xl font-semibold text-white">
                  {summary?.totalAlerts || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Critical Alerts</p>
                <p className="text-2xl font-semibold text-red-600">
                  {summary?.criticalAlerts || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Low Stock</p>
                <p className="text-2xl font-semibold text-orange-600">
                  {summary?.lowStockAlerts || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-300">Affected Products</p>
                <p className="text-2xl font-semibold text-white">
                  {summary?.alertsByProduct?.length || 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Reorder Alerts</CardTitle>
              <CardDescription>
                Products that need immediate attention
              </CardDescription>
            </div>
            <Button 
              onClick={handleRefresh}
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              {isFetching ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(alerts ?? []).map((alert: any) => (
              <div key={`${alert.product.id}-${alert.location.id}`} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-red-100">
                      <AlertTriangle className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{alert.product.name}</span>
                        <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-600">
                          {alert.quantity <= 0 ? 'OUT OF STOCK' : 'LOW STOCK'}
                        </span>
                      </div>
                      <div className="text-sm text-gray-300">
                        SKU: {alert.product.code} • {alert.location.name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-red-600">
                      {alert.quantity} / {alert.product.reorderLevel}
                    </div>
                    <div className="text-sm text-gray-300">
                      Reorder Level: {alert.product.reorderLevel}
                    </div>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Current Stock</span>
                    <span>Reorder Level</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-red-500 h-2 rounded-full" 
                      style={{ 
                        width: `${Math.min(100, (alert.quantity / alert.product.reorderLevel) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {(alerts ?? []).length === 0 && (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300">No reorder alerts at this time</p>
              <p className="text-sm text-gray-400 mt-1">All products are well stocked</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

