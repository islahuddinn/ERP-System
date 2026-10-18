'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Warehouse, MapPin, User, Package, Gauge, MoreVertical } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Warehouse as WarehouseType } from '@/hooks/useWarehouses'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface WarehouseCardProps {
  warehouse: WarehouseType
  onEdit?: (warehouse: WarehouseType) => void
  onDelete?: (warehouse: WarehouseType) => void
  onAssignManager?: (warehouse: WarehouseType) => void
}

export function WarehouseCard({
  warehouse,
  onEdit,
  onDelete,
  onAssignManager,
}: WarehouseCardProps) {
  const router = useRouter()

  const capacityPercentage = warehouse.totalCapacity > 0
    ? Math.round((warehouse.usedCapacity / warehouse.totalCapacity) * 100)
    : 0

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 95) return 'bg-red-500'
    if (percentage >= 85) return 'bg-orange-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getCapacityBadgeColor = (percentage: number) => {
    if (percentage >= 95) return 'bg-red-100 text-red-700 border-red-200'
    if (percentage >= 85) return 'bg-orange-100 text-orange-700 border-orange-200'
    if (percentage >= 70) return 'bg-yellow-100 text-yellow-700 border-yellow-200'
    return 'bg-green-100 text-green-700 border-green-200'
  }

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-700 border-green-200',
      INACTIVE: 'bg-gray-100 text-gray-700 border-gray-200',
      MAINTENANCE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      FULL: 'bg-red-100 text-red-700 border-red-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-gray-200 bg-white">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 shrink-0">
              <Warehouse className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 truncate flex-1 min-w-0">
                  {warehouse.name}
                </h3>
                <Badge className={`${getStatusColor(warehouse.status)} whitespace-nowrap shrink-0 text-xs px-2 py-0.5`}>
                  {warehouse.status}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 font-mono mb-2 truncate">{warehouse.code}</p>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                <div className="flex items-center gap-1 shrink-0">
                  <Package className="h-4 w-4 text-gray-400 shrink-0" />
                  <span className="capitalize truncate">{warehouse.warehouseType.toLowerCase()}</span>
                </div>
                {warehouse.location && (
                  <div className="flex items-center gap-1 min-w-0">
                    <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="truncate">{warehouse.location.name}</span>
                  </div>
                )}
                {warehouse.manager && (
                  <div className="flex items-center gap-1 min-w-0">
                    <User className="h-4 w-4 text-gray-400 shrink-0" />
                    <span className="truncate">{warehouse.manager.name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-gray-200">
              <DropdownMenuItem
                onClick={() => router.push(`/dashboard/factory/warehouses/${warehouse.id}`)}
                className="text-gray-700 hover:bg-gray-50"
              >
                View Details
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem
                  onClick={() => onEdit(warehouse)}
                  className="text-gray-700 hover:bg-gray-50"
                >
                  Edit
                </DropdownMenuItem>
              )}
              {onAssignManager && (
                <DropdownMenuItem
                  onClick={() => onAssignManager(warehouse)}
                  className="text-gray-700 hover:bg-gray-50"
                >
                  Assign Manager
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(warehouse)}
                  className="text-red-600 hover:bg-red-50"
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Capacity Section */}
        <div className="space-y-3 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Capacity</span>
            </div>
            <Badge className={getCapacityBadgeColor(capacityPercentage)}>
              {capacityPercentage}%
            </Badge>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getCapacityColor(capacityPercentage)}`}
              style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
            <div>
              <p className="text-gray-500">Used</p>
              <p className="font-semibold text-gray-900">{warehouse.usedCapacity.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500">Available</p>
              <p className="font-semibold text-green-600">{warehouse.availableCapacity.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500">Total</p>
              <p className="font-semibold text-gray-900">{warehouse.totalCapacity.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        {warehouse._count && (
          <div className="flex items-center gap-4 pt-4 border-t border-gray-200 mt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{warehouse._count.zones || 0}</p>
              <p className="text-xs text-gray-500">Zones</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{warehouse._count.stockBalances || 0}</p>
              <p className="text-xs text-gray-500">Products</p>
            </div>
            {warehouse._count.capacityAlerts > 0 && (
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{warehouse._count.capacityAlerts}</p>
                <p className="text-xs text-gray-500">Alerts</p>
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        <div className="pt-4 mt-4 border-t border-gray-200">
          <Button
            onClick={() => router.push(`/dashboard/factory/warehouses/${warehouse.id}`)}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

