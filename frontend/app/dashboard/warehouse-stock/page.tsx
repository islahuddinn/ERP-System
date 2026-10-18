'use client'

import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { 
  Package, 
  Warehouse, 
  MapPin, 
  TrendingUp, 
  AlertTriangle, 
  DollarSign,
  BarChart3,
  ArrowRight,
  RefreshCw,
  ArrowRightLeft
} from 'lucide-react'
import { useWarehouseStockSummary } from '@/hooks/useWarehouseStock'
import { useWarehouses } from '@/hooks/useWarehouses'
import { AdjustStockModal, TransferStockModal } from '@/components/factory/warehouse-stock'
import { PermissionGuard } from '@/components/auth/PermissionGuard'
import Link from 'next/link'

export default function WarehouseStockOverviewPage() {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isAdjustOpen, setIsAdjustOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)

  const { data: summary, isLoading: summaryLoading, refetch: refetchSummary } = useWarehouseStockSummary()
  const { data: warehousesData, isLoading: warehousesLoading } = useWarehouses({ limit: 1000 })
  const warehouses = warehousesData?.data || []

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([refetchSummary()])
    setIsRefreshing(false)
  }

  if (summaryLoading || warehousesLoading) {
    return (
      <ProtectedRoute requiredPermission="warehouses.view">
        <div className="factory-section">
          <div className="factory-page-container">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-transparent border-t-green-600"></div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="warehouses.view">
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="factory-heading flex items-center gap-3">
                  <Package className="h-8 w-8 text-green-600" />
                  Warehouse Stock Overview
                </h1>
                <p className="factory-subheading">
                  Complete overview of stock across all warehouses and zones
                </p>
              </div>
              <div className="flex gap-2">
                <PermissionGuard requiredPermission="stock.transfer">
                  <Button 
                    onClick={() => setIsTransferOpen(true)}
                    variant="outline"
                    className="border-gray-200 hover:bg-gray-50"
                  >
                    <ArrowRightLeft className="h-4 w-4 mr-2" />
                    Transfer Stock
                  </Button>
                </PermissionGuard>
                <Button 
                  onClick={handleRefresh}
                  variant="outline"
                  className="border-gray-200 hover:bg-gray-50"
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
              </div>
            </div>

            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="p-4 text-sm text-amber-900">
                <p className="font-medium">Where does stock appear?</p>
                <ul className="mt-2 list-disc pl-5 space-y-1 text-amber-800">
                  <li>
                    <strong>Raw materials from GRN</strong> →{' '}
                    <Link href="/dashboard/raw-materials/batches" className="underline">
                      Raw Materials → Batches
                    </Link>{' '}
                    (not this page).
                  </li>
                  <li>
                    <strong>Finished goods for shop sales</strong> →{' '}
                    <Link href="/dashboard/sales/factory-stock" className="underline">
                      Sales → Factory Stock
                    </Link>{' '}
                    → branch requests → deliveries.
                  </li>
                  <li>
                    <strong>This page</strong> shows finished-goods balances inside warehouses after
                    production completion, material transfers, or stocktake — not from purchase GRN.
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="factory-stat-card border-blue-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                      <Package className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                  <CardDescription className="text-gray-600 font-semibold">
                    Total Products
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    {summary?.totalProducts || 0}
                  </div>
                  <p className="text-sm text-gray-500">Unique products in stock</p>
                </CardContent>
              </Card>

              <Card className="factory-stat-card border-green-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-3 rounded-xl bg-green-50 border border-green-100">
                      <TrendingUp className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                  <CardDescription className="text-gray-600 font-semibold">
                    Total Quantity
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    {summary?.totalQuantity.toLocaleString() || '0'}
                  </div>
                  <p className="text-sm text-gray-500">Total units in stock</p>
                </CardContent>
              </Card>

              <Card className="factory-stat-card border-purple-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
                      <DollarSign className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                  <CardDescription className="text-gray-600 font-semibold">
                    Total Stock Value
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    ${summary?.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                  </div>
                  <p className="text-sm text-gray-500">Total inventory value</p>
                </CardContent>
              </Card>

              <Card className="factory-stat-card border-orange-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-3 rounded-xl bg-orange-50 border border-orange-100">
                      <AlertTriangle className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                  <CardDescription className="text-gray-600 font-semibold">
                    Low Stock Items
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-gray-900 mb-2">
                    {summary?.lowStockItems || 0}
                  </div>
                  <p className="text-sm text-gray-500">Items below reorder level</p>
                </CardContent>
              </Card>
            </div>

            {/* Stock Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Stock by Warehouse */}
              <Card className="factory-light-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-gray-900 flex items-center gap-2">
                        <Warehouse className="h-5 w-5 text-green-600" />
                        Stock by Warehouse
                      </CardTitle>
                      <CardDescription className="text-gray-600 mt-1">
                        Product distribution across warehouses
                      </CardDescription>
                    </div>
                    <Link href="/dashboard/warehouse-stock/warehouses">
                      <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                        View All
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {summary?.warehouses && summary.warehouses.length > 0 ? (
                      summary.warehouses.slice(0, 5).map((warehouse: any) => (
                        <Link 
                          key={warehouse.warehouseId}
                          href={`/dashboard/warehouse-stock/warehouses?warehouseId=${warehouse.warehouseId}`}
                        >
                          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-green-50">
                                <Warehouse className="h-5 w-5 text-green-600" />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{warehouse.warehouseName}</div>
                                <div className="text-sm text-gray-500">
                                  {warehouse.productCount} products • {warehouse.totalQuantity.toLocaleString()} units
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-gray-900">
                                ${warehouse.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="text-xs text-gray-500">Value</div>
                            </div>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No stock data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Stock by Zone */}
              <Card className="factory-light-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-gray-900 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-purple-600" />
                        Stock by Zone
                      </CardTitle>
                      <CardDescription className="text-gray-600 mt-1">
                        Product distribution across zones
                      </CardDescription>
                    </div>
                    <Link href="/dashboard/warehouse-stock/zones">
                      <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                        View All
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {summary?.zones && summary.zones.length > 0 ? (
                      summary.zones.slice(0, 5).map((zone: any) => (
                        <Link 
                          key={zone.zoneId}
                          href={`/dashboard/warehouse-stock/zones?zoneId=${zone.zoneId}`}
                        >
                          <div className="flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-purple-50">
                                <MapPin className="h-5 w-5 text-purple-600" />
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">{zone.zoneName}</div>
                                <div className="text-sm text-gray-500">
                                  {zone.warehouseName} • {zone.productCount} products
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold text-gray-900">
                                {zone.totalQuantity.toLocaleString()}
                              </div>
                              <div className="text-xs text-gray-500">Units</div>
                            </div>
                          </div>
                        </Link>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600">No zone stock data available</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Links */}
            <Card className="factory-light-card">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-600" />
                  Quick Navigation
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Navigate to detailed stock views
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Link href="/dashboard/warehouse-stock/warehouses">
                    <Button variant="outline" className="w-full justify-start h-auto p-4 hover:bg-gray-50 transition-all border-gray-200">
                      <div className="flex items-center gap-3 w-full">
                        <Warehouse className="h-5 w-5 text-green-600" />
                        <div className="text-left flex-1">
                          <div className="font-semibold text-gray-900">Stock by Warehouse</div>
                          <div className="text-xs text-gray-500">View warehouse-wise stock</div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </Button>
                  </Link>
                  <Link href="/dashboard/warehouse-stock/zones">
                    <Button variant="outline" className="w-full justify-start h-auto p-4 hover:bg-gray-50 transition-all border-gray-200">
                      <div className="flex items-center gap-3 w-full">
                        <MapPin className="h-5 w-5 text-purple-600" />
                        <div className="text-left flex-1">
                          <div className="font-semibold text-gray-900">Stock by Zone</div>
                          <div className="text-xs text-gray-500">View zone-wise stock</div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </Button>
                  </Link>
                  <Link href="/dashboard/warehouse-stock/transactions">
                    <Button variant="outline" className="w-full justify-start h-auto p-4 hover:bg-gray-50 transition-all border-gray-200">
                      <div className="flex items-center gap-3 w-full">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        <div className="text-left flex-1">
                          <div className="font-semibold text-gray-900">Stock Transactions</div>
                          <div className="text-xs text-gray-500">View transaction history</div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </Button>
                  </Link>
                  <Link href="/dashboard/warehouse-stock/alerts">
                    <Button variant="outline" className="w-full justify-start h-auto p-4 hover:bg-gray-50 transition-all border-gray-200">
                      <div className="flex items-center gap-3 w-full">
                        <AlertTriangle className="h-5 w-5 text-orange-600" />
                        <div className="text-left flex-1">
                          <div className="font-semibold text-gray-900">Capacity Alerts</div>
                          <div className="text-xs text-gray-500">View capacity alerts</div>
                        </div>
                        <ArrowRight className="h-4 w-4 text-gray-400" />
                      </div>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modals */}
      <TransferStockModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
      />
    </ProtectedRoute>
  )
}

