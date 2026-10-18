'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MapPin, Package, Gauge, Thermometer, Droplets, MoreVertical, Edit, Trash2 } from 'lucide-react'
import type { WarehouseZone } from '@/hooks/useWarehouses'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ZoneCardProps {
  zone: WarehouseZone
  warehouseName?: string
  onEdit?: (zone: WarehouseZone) => void
  onDelete?: (zone: WarehouseZone) => void
}

export function ZoneCard({
  zone,
  warehouseName,
  onEdit,
  onDelete,
}: ZoneCardProps) {
  const capacityPercentage = zone.totalCapacity > 0
    ? Math.round((zone.usedCapacity / zone.totalCapacity) * 100)
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

  const getZoneTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      RAW_MATERIALS: 'bg-green-100 text-green-700 border-green-200',
      PACKAGING: 'bg-blue-100 text-blue-700 border-blue-200',
      FINISHED_GOODS: 'bg-purple-100 text-purple-700 border-purple-200',
      QUARANTINE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      REJECTED: 'bg-red-100 text-red-700 border-red-200',
      TEMPORARY: 'bg-gray-100 text-gray-700 border-gray-200',
    }
    return colors[type] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-gray-200 bg-white">
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4 gap-3">
          <div className="flex items-start gap-4 flex-1 min-w-0">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 shrink-0">
              <MapPin className="h-6 w-6 text-green-600" />
            </div>
            <div className="flex-1 min-w-0 overflow-hidden">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-gray-900 truncate flex-1 min-w-0">
                  {zone.name}
                </h3>
                <Badge className={`${getZoneTypeColor(zone.zoneType)} whitespace-nowrap shrink-0 text-xs px-2 py-0.5`}>
                  {zone.zoneType.replace('_', ' ')}
                </Badge>
              </div>
              <p className="text-sm text-gray-500 font-mono mb-2 truncate">{zone.code}</p>
              {warehouseName && (
                <p className="text-sm text-gray-600 mb-2 truncate">Warehouse: {warehouseName}</p>
              )}
              {zone.description && (
                <p className="text-sm text-gray-600 truncate">{zone.description}</p>
              )}
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border-gray-200">
              {onEdit && (
                <DropdownMenuItem
                  onClick={() => onEdit(zone)}
                  className="text-gray-700 hover:bg-gray-50"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(zone)}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
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
              <p className="font-semibold text-gray-900">{zone.usedCapacity.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500">Available</p>
              <p className="font-semibold text-green-600">{zone.availableCapacity.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500">Total</p>
              <p className="font-semibold text-gray-900">{zone.totalCapacity.toFixed(2)}</p>
            </div>
          </div>
        </div>

        {/* Environmental Conditions */}
        {(zone.temperature !== undefined || zone.humidity !== undefined) && (
          <div className="flex items-center gap-4 pt-4 border-t border-gray-200 mt-4">
            {zone.temperature !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                <Thermometer className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{zone.temperature}°C</span>
              </div>
            )}
            {zone.humidity !== undefined && (
              <div className="flex items-center gap-2 text-sm">
                <Droplets className="h-4 w-4 text-gray-400" />
                <span className="text-gray-600">{zone.humidity}%</span>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        {zone._count && (
          <div className="flex items-center gap-4 pt-4 border-t border-gray-200 mt-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">{zone._count.stockBalances || 0}</p>
              <p className="text-xs text-gray-500">Products</p>
            </div>
          </div>
        )}

        {/* Status */}
        <div className="pt-4 mt-4 border-t border-gray-200">
          <Badge 
            className={zone.isActive 
              ? 'bg-green-100 text-green-700 border-green-200' 
              : 'bg-gray-100 text-gray-700 border-gray-200'}
          >
            {zone.isActive ? 'Active' : 'Inactive'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}

