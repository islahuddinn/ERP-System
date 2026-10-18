'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Factory, MapPin, User, Settings, Activity, MoreVertical } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Plant } from '@/hooks/usePlants'
import { userResolver } from '@/lib/user-resolver'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface PlantCardProps {
  plant: Plant
  onEdit?: (plant: Plant) => void
  onDelete?: (plant: Plant) => void
  onAssignManager?: (plant: Plant) => void
  onCreateLine?: (plant: Plant) => void
  onCreateMachine?: (plant: Plant) => void
}

export function PlantCard({
  plant,
  onEdit,
  onDelete,
  onAssignManager,
  onCreateLine,
  onCreateMachine,
}: PlantCardProps) {
  const router = useRouter()

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      ACTIVE: 'bg-green-100 text-green-700 border-green-200',
      INACTIVE: 'bg-gray-100 text-gray-700 border-gray-200',
      MAINTENANCE: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    }
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200'
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200 border-gray-200 bg-white">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Factory className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{plant.name}</h3>
                <p className="text-sm text-gray-500">{plant.code}</p>
              </div>
              <Badge className={getStatusColor(plant.status)}>
                {plant.status}
              </Badge>
            </div>

            <div className="space-y-2">
              {plant.location && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <MapPin className="h-4 w-4 shrink-0" />
                  <span className="truncate">{plant.location.name}</span>
                </div>
              )}

              {plant.managerId && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <User className="h-4 w-4 shrink-0" />
                  <span className="truncate">{userResolver.getUserName(plant.managerId)}</span>
                </div>
              )}

              <div className="flex items-center gap-4 pt-2">
                {onCreateLine ? (
                  <button
                    onClick={() => onCreateLine(plant)}
                    className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 hover:underline cursor-pointer transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    <span>{plant.productionLinesCount} Lines</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Settings className="h-4 w-4" />
                    <span>{plant.productionLinesCount} Lines</span>
                  </div>
                )}
                {onCreateMachine ? (
                  <button
                    onClick={() => onCreateMachine(plant)}
                    className="flex items-center gap-1 text-sm text-green-600 hover:text-green-700 hover:underline cursor-pointer transition-colors"
                  >
                    <Factory className="h-4 w-4" />
                    <span>{plant.machinesCount} Machines</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Factory className="h-4 w-4" />
                    <span>{plant.machinesCount} Machines</span>
                  </div>
                )}
                {plant.activeWorkOrdersCount > 0 && (
                  <div className="flex items-center gap-1 text-sm text-green-600">
                    <Activity className="h-4 w-4" />
                    <span>{plant.activeWorkOrdersCount} Active WO</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/dashboard/factory/plants/${plant.id}`)}>
                View Details
              </DropdownMenuItem>
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(plant)}>
                  Edit
                </DropdownMenuItem>
              )}
              {onAssignManager && (
                <DropdownMenuItem onClick={() => onAssignManager(plant)}>
                  Assign Manager
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(plant)}
                  className="text-red-600 focus:text-red-600"
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  )
}

