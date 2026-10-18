'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical, Package, Calendar, MapPin, AlertTriangle, Eye, Edit } from 'lucide-react'
import type { Batch } from '@/data/dummy/factory/batches'
import { format } from 'date-fns'

interface BatchCardProps {
  batch: Batch
  onView?: (batch: Batch) => void
  onEdit?: (batch: Batch) => void
}

export function BatchCard({ batch, onView, onEdit }: BatchCardProps) {

  // Derive quantities in a backend-safe way
  const totalQuantity = Number(
    (batch as any).totalQuantity ??
    (batch as any).quantity ??
    0,
  )

  const consumedQuantity = Number((batch as any).consumedQuantity ?? 0)

  const availableQuantity = Number(
    (batch as any).availableQuantity ??
    (batch as any).availableQty ??
    totalQuantity - consumedQuantity,
  )

  const expiryDate = batch.expiryDate ? new Date(batch.expiryDate) : new Date()
  const today = new Date()
  const daysToExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-700 border-green-200">{status}</Badge>
      case 'EXPIRED':
        return <Badge className="bg-red-100 text-red-700 border-red-200">{status}</Badge>
      case 'QUARANTINE':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">{status}</Badge>
      case 'CONSUMED':
        return <Badge className="bg-gray-100 text-gray-700 border-gray-200">{status}</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }
  
  const getExpiryColor = (days: number) => {
    if (days < 0) return 'text-red-600'
    if (days <= 7) return 'text-red-600'
    if (days <= 30) return 'text-orange-600'
    if (days <= 60) return 'text-yellow-600'
    return 'text-green-600'
  }
  
  const getQualityBadge = (qualityStatus?: string) => {
    if (!qualityStatus) return null
    
    switch (qualityStatus) {
      case 'PASSED':
        return <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Passed</Badge>
      case 'FAILED':
        return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">Failed</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 text-xs">Pending</Badge>
      case 'CONDITIONAL':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">Conditional</Badge>
      default:
        return null
    }
  }
  
  return (
    <Card className="factory-light-card hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-gray-900 text-lg mb-1 truncate">{batch.batchNumber}</CardTitle>
            <CardDescription className="text-gray-600 truncate">
              {batch.product?.name || 'Unknown Product'}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onView && (
                <DropdownMenuItem onClick={() => onView(batch)}>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
              )}
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(batch)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Status and Quality */}
        <div className="flex items-center gap-2 flex-wrap">
          {getStatusBadge(batch.status)}
          {getQualityBadge(batch.qualityStatus)}
        </div>
        
        {/* Location */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <MapPin className="h-4 w-4 shrink-0" />
          <span className="truncate">
            {batch.warehouse?.name}
            {batch.zone && ` • ${batch.zone.name}`}
          </span>
        </div>
        
        {/* Quantities */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div>
            <p className="text-gray-500 text-xs">Total</p>
            <p className="text-gray-900 font-semibold">{totalQuantity.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Available</p>
            <p className="text-green-600 font-semibold">{availableQuantity.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Consumed</p>
            <p className="text-gray-600 font-semibold">{consumedQuantity.toLocaleString()}</p>
          </div>
        </div>
        
        {/* Expiry Date */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-gray-500 text-xs">Expiry Date</p>
            <p className={`font-semibold ${getExpiryColor(daysToExpiry)}`}>
              {format(expiryDate, 'MMM dd, yyyy')}
            </p>
            {daysToExpiry >= 0 && (
              <p className={`text-xs ${getExpiryColor(daysToExpiry)}`}>
                {daysToExpiry === 0 ? 'Expires today' : `${daysToExpiry} days remaining`}
              </p>
            )}
            {daysToExpiry < 0 && (
              <p className="text-xs text-red-600">
                Expired {Math.abs(daysToExpiry)} days ago
              </p>
            )}
          </div>
        </div>
        
        {/* Expiring Soon Alert */}
        {daysToExpiry > 0 && daysToExpiry <= 30 && (
          <div className="flex items-center gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-yellow-600 shrink-0" />
            <p className="text-xs text-yellow-700">
              {daysToExpiry <= 7 ? 'Expiring soon!' : 'Expiring in 30 days'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

