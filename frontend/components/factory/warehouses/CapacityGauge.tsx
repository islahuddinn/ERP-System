'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2 } from 'lucide-react'

interface Warehouse {
  id: string
  name: string
  code: string
  totalCapacity: number
  usedCapacity: number
  availableCapacity: number
  capacityUnit: string
  status: string
}

interface CapacityInfo {
  totalCapacity?: number
  usedCapacity?: number
  availableCapacity?: number
  capacityPercentage?: number
  capacityUnit?: string
}

interface CapacityGaugeProps {
  warehouse: Warehouse
  capacityInfo?: CapacityInfo
  isLoading?: boolean
}

export function CapacityGauge({ warehouse, capacityInfo, isLoading }: CapacityGaugeProps) {

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  const totalCapacity = capacityInfo?.totalCapacity ?? warehouse?.totalCapacity ?? 0
  const usedCapacity = capacityInfo?.usedCapacity ?? warehouse?.usedCapacity ?? 0
  const availableCapacity = capacityInfo?.availableCapacity ?? warehouse?.availableCapacity ?? 0
  // Calculate percentage with higher precision so very small changes are visible
  let capacityPercentage = capacityInfo?.capacityPercentage ?? 
    (totalCapacity > 0 && usedCapacity != null ? (usedCapacity / totalCapacity) * 100 : 0)

  // Ensure tiny non-zero percentages still render a visible arc
  if (capacityPercentage > 0 && capacityPercentage < 0.1) {
    capacityPercentage = 0.1
  }

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 95) return 'text-red-600 bg-red-50 border-red-200'
    if (percentage >= 85) return 'text-orange-600 bg-orange-50 border-orange-200'
    if (percentage >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200'
    return 'text-green-600 bg-green-50 border-green-200'
  }

  const getProgressBarColor = (percentage: number) => {
    if (percentage >= 95) return 'bg-red-500'
    if (percentage >= 85) return 'bg-orange-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const getStatusLabel = (percentage: number) => {
    if (percentage >= 95) return 'FULL'
    if (percentage >= 85) return 'CRITICAL'
    if (percentage >= 70) return 'WARNING'
    return 'NORMAL'
  }

  return (
    <div className="space-y-6">
      {/* Large Capacity Gauge */}
      <div className="flex flex-col items-center justify-center py-8">
        <div className="relative w-64 h-64">
          {/* Circular Progress */}
          <svg className="transform -rotate-90 w-64 h-64">
            <circle
              cx="128"
              cy="128"
              r="100"
              stroke="currentColor"
              strokeWidth="20"
              fill="none"
              className="text-gray-200"
            />
            <circle
              cx="128"
              cy="128"
              r="100"
              stroke="currentColor"
              strokeWidth="20"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 100}`}
              strokeDashoffset={`${2 * Math.PI * 100 * (1 - capacityPercentage / 100)}`}
              className={getProgressBarColor(capacityPercentage)}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className={`text-4xl font-bold ${getCapacityColor(capacityPercentage)}`}>
              {capacityPercentage != null && !isNaN(capacityPercentage) ? capacityPercentage.toFixed(2) : '0.00'}%
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {getStatusLabel(capacityPercentage)}
            </div>
          </div>
        </div>
      </div>

      {/* Capacity Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="factory-light-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Total Capacity</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalCapacity != null ? totalCapacity.toFixed(2) : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">{warehouse?.capacityUnit || ''}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="factory-light-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Used</p>
              <p className="text-2xl font-bold text-gray-900">
                {usedCapacity != null ? usedCapacity.toFixed(2) : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">{warehouse?.capacityUnit || ''}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="factory-light-card">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">Available</p>
              <p className="text-2xl font-bold text-gray-900">
                {availableCapacity != null ? availableCapacity.toFixed(2) : 'N/A'}
              </p>
              <p className="text-xs text-gray-500 mt-1">{warehouse?.capacityUnit || ''}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Linear Progress Bar */}
      <div>
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-600">Capacity Usage</span>
          <Badge className={getCapacityColor(capacityPercentage)}>
            {getStatusLabel(capacityPercentage)}
          </Badge>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-6">
          <div
            className={`h-6 rounded-full transition-all duration-300 ${getProgressBarColor(capacityPercentage)}`}
            style={{ width: `${Math.min(capacityPercentage, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-gray-500">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </div>

      {/* Threshold Indicators */}
      <div className="grid grid-cols-4 gap-2 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="h-3 w-full bg-green-500 rounded mb-2" />
          <p className="text-xs text-gray-600">Normal</p>
          <p className="text-xs text-gray-500">&lt; 70%</p>
        </div>
        <div className="text-center">
          <div className="h-3 w-full bg-yellow-500 rounded mb-2" />
          <p className="text-xs text-gray-600">Warning</p>
          <p className="text-xs text-gray-500">70-85%</p>
        </div>
        <div className="text-center">
          <div className="h-3 w-full bg-orange-500 rounded mb-2" />
          <p className="text-xs text-gray-600">Critical</p>
          <p className="text-xs text-gray-500">85-95%</p>
        </div>
        <div className="text-center">
          <div className="h-3 w-full bg-red-500 rounded mb-2" />
          <p className="text-xs text-gray-600">Full</p>
          <p className="text-xs text-gray-500">&gt; 95%</p>
        </div>
      </div>
    </div>
  )
}
