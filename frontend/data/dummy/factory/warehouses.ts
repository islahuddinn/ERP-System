// Dummy data generator for warehouses
// This file provides realistic dummy data for testing and development

import type { Warehouse, WarehouseZone, CapacityAlert } from '@/hooks/useWarehouses'

// Dummy locations
export const dummyLocations = [
  { id: 'loc-1', name: 'Main Factory', address: '123 Industrial Park, City' },
  { id: 'loc-2', name: 'North Warehouse', address: '456 North Street, City' },
  { id: 'loc-3', name: 'South Distribution', address: '789 South Avenue, City' },
  { id: 'loc-4', name: 'East Storage', address: '321 East Road, City' },
  { id: 'loc-5', name: 'West Facility', address: '654 West Boulevard, City' },
]

// Dummy users (managers)
export const dummyUsers = [
  { id: 'user-1', name: 'John Smith', email: 'john.smith@factory.com', role: 'MANAGER' },
  { id: 'user-2', name: 'Sarah Johnson', email: 'sarah.j@factory.com', role: 'MANAGER' },
  { id: 'user-3', name: 'Michael Brown', email: 'michael.b@factory.com', role: 'MANAGER' },
  { id: 'user-4', name: 'Emily Davis', email: 'emily.d@factory.com', role: 'MANAGER' },
  { id: 'user-5', name: 'David Wilson', email: 'david.w@factory.com', role: 'MANAGER' },
]

// Generate dummy warehouses
export function generateDummyWarehouses(count: number = 12): Warehouse[] {
  const warehouses: Warehouse[] = []
  const types: ('STORAGE' | 'DISPATCH')[] = ['STORAGE', 'DISPATCH']
  const statuses: ('ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'FULL')[] = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'INACTIVE', 'MAINTENANCE', 'FULL']
  const capacityUnits = ['CUBIC_METER', 'SQUARE_METER', 'UNIT', 'KILOGRAM', 'TON']

  for (let i = 1; i <= count; i++) {
    const type = types[Math.floor(Math.random() * types.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const location = dummyLocations[Math.floor(Math.random() * dummyLocations.length)]
    const manager = Math.random() > 0.3 ? dummyUsers[Math.floor(Math.random() * dummyUsers.length)] : undefined
    const capacityUnit = capacityUnits[Math.floor(Math.random() * capacityUnits.length)]
    
    // Generate realistic capacity values
    const totalCapacity = Math.floor(Math.random() * 5000) + 1000 // 1000-6000
    const usedCapacity = Math.floor(totalCapacity * (Math.random() * 0.9 + 0.1)) // 10-100% of total
    const availableCapacity = totalCapacity - usedCapacity
    
    // Calculate capacity percentage
    const capacityPercentage = (usedCapacity / totalCapacity) * 100
    
    // Adjust status based on capacity
    let finalStatus = status
    if (capacityPercentage >= 95) finalStatus = 'FULL'
    else if (capacityPercentage >= 85 && status === 'ACTIVE') finalStatus = 'ACTIVE' // Keep active but show as critical
    
    const warehouse: Warehouse = {
      id: `wh-${i}`,
      name: `${type === 'STORAGE' ? 'Storage' : 'Dispatch'} Warehouse ${i}`,
      code: `WH-${String(i).padStart(3, '0')}`,
      warehouseType: type,
      locationId: location.id,
      address: `${Math.floor(Math.random() * 9999)} Warehouse Street, City`,
      contactPerson: manager?.name || `Contact Person ${i}`,
      contactPhone: `+1-555-${Math.floor(Math.random() * 9000) + 1000}`,
      contactEmail: manager?.email || `warehouse${i}@factory.com`,
      totalCapacity,
      usedCapacity,
      availableCapacity,
      capacityUnit,
      status: finalStatus,
      isActive: finalStatus !== 'INACTIVE',
      managerId: manager?.id,
      description: `${type === 'STORAGE' ? 'Storage warehouse for raw materials and packaging' : 'Dispatch warehouse for finished goods'}`,
      notes: i % 3 === 0 ? 'Requires regular maintenance' : undefined,
      createdAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      location: {
        id: location.id,
        name: location.name,
        type: 'WAREHOUSE',
      },
      manager: manager ? {
        id: manager.id,
        name: manager.name,
        email: manager.email,
      } : undefined,
      _count: {
        zones: Math.floor(Math.random() * 8) + 3, // 3-10 zones
        stockBalances: Math.floor(Math.random() * 200) + 50, // 50-250 products
        capacityAlerts: capacityPercentage >= 85 ? Math.floor(Math.random() * 3) + 1 : 0,
      },
    }

    warehouses.push(warehouse)
  }

  return warehouses
}

// Generate dummy zones for a warehouse
export function generateDummyZones(warehouseId: string, count: number = 6): WarehouseZone[] {
  const zones: WarehouseZone[] = []
  const zoneTypes: ('RAW_MATERIALS' | 'PACKAGING' | 'FINISHED_GOODS' | 'QUARANTINE' | 'REJECTED' | 'TEMPORARY')[] = [
    'RAW_MATERIALS',
    'PACKAGING',
    'FINISHED_GOODS',
    'QUARANTINE',
    'REJECTED',
    'TEMPORARY',
  ]

  for (let i = 1; i <= count; i++) {
    const zoneType = zoneTypes[Math.floor(Math.random() * zoneTypes.length)]
    const totalCapacity = Math.floor(Math.random() * 500) + 100 // 100-600
    const usedCapacity = Math.floor(totalCapacity * (Math.random() * 0.8 + 0.1)) // 10-90% of total
    const availableCapacity = totalCapacity - usedCapacity

    const zone: WarehouseZone = {
      id: `zone-${warehouseId}-${i}`,
      warehouseId,
      name: `${zoneType.replace('_', ' ')} Zone ${i}`,
      code: `Z-${String(i).padStart(2, '0')}`,
      zoneType,
      description: `${zoneType.replace('_', ' ').toLowerCase()} storage zone`,
      totalCapacity,
      usedCapacity,
      availableCapacity,
      isActive: Math.random() > 0.1, // 90% active
      temperature: zoneType === 'RAW_MATERIALS' || zoneType === 'FINISHED_GOODS' 
        ? Math.floor(Math.random() * 10) + 15 // 15-25°C
        : undefined,
      humidity: zoneType === 'RAW_MATERIALS' || zoneType === 'FINISHED_GOODS'
        ? Math.floor(Math.random() * 20) + 40 // 40-60%
        : undefined,
      notes: i % 4 === 0 ? 'Requires temperature monitoring' : undefined,
      createdAt: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
      _count: {
        stockBalances: Math.floor(Math.random() * 50) + 10, // 10-60 products
      },
    }

    zones.push(zone)
  }

  return zones
}

// Generate dummy capacity alerts
export function generateDummyCapacityAlerts(warehouseId: string, zoneIds: string[] = [], count: number = 3): CapacityAlert[] {
  const alerts: CapacityAlert[] = []
  const alertLevels: ('NORMAL' | 'WARNING' | 'CRITICAL' | 'FULL')[] = ['WARNING', 'CRITICAL', 'FULL']
  const messages = [
    'Capacity is approaching critical levels',
    'Immediate action required to prevent overflow',
    'Warehouse capacity is nearly full',
    'Consider redistributing stock to other warehouses',
    'Zone capacity threshold exceeded',
  ]

  for (let i = 1; i <= count; i++) {
    const alertLevel = alertLevels[Math.floor(Math.random() * alertLevels.length)]
    const zoneId = zoneIds.length > 0 && Math.random() > 0.5 
      ? zoneIds[Math.floor(Math.random() * zoneIds.length)]
      : undefined
    
    let currentCapacity = 0
    let threshold = 0
    
    switch (alertLevel) {
      case 'WARNING':
        currentCapacity = Math.random() * 15 + 70 // 70-85%
        threshold = 70
        break
      case 'CRITICAL':
        currentCapacity = Math.random() * 10 + 85 // 85-95%
        threshold = 85
        break
      case 'FULL':
        currentCapacity = Math.random() * 5 + 95 // 95-100%
        threshold = 95
        break
      default:
        currentCapacity = 60
        threshold = 70
    }

    const totalCapacity = 1000
    const currentUsed = (currentCapacity / 100) * totalCapacity
    const currentAvailable = totalCapacity - currentUsed

    const alert: CapacityAlert = {
      id: `alert-${warehouseId}-${i}`,
      warehouseId,
      zoneId,
      alertLevel,
      currentCapacity,
      currentUsed,
      currentAvailable,
      threshold,
      message: messages[Math.floor(Math.random() * messages.length)],
      isResolved: Math.random() > 0.7, // 30% resolved
      resolvedById: Math.random() > 0.7
        ? dummyUsers[Math.floor(Math.random() * dummyUsers.length)].id
        : undefined,
      resolvedAt: Math.random() > 0.7
        ? new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString()
        : undefined,
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      zone: zoneId ? {
        id: zoneId,
        name: `Zone ${zoneId.split('-').pop()}`,
        code: `Z-${zoneId.split('-').pop()}`,
      } : undefined,
    }

    alerts.push(alert)
  }

  return alerts
}

// Export all dummy data
export const dummyWarehouses = generateDummyWarehouses(12)

// Pre-generate zones for all warehouses to ensure consistency
export const dummyZonesByWarehouse = new Map<string, WarehouseZone[]>()
dummyWarehouses.forEach(warehouse => {
  const zoneCount = Math.floor(Math.random() * 5) + 5 // 5-10 zones per warehouse
  const zones = generateDummyZones(warehouse.id, zoneCount)
  dummyZonesByWarehouse.set(warehouse.id, zones)
})

// Helper to get dummy zones for a warehouse (returns pre-generated zones)
export function getDummyZonesForWarehouse(warehouseId: string): WarehouseZone[] {
  // Return pre-generated zones if available, otherwise generate new ones
  if (dummyZonesByWarehouse.has(warehouseId)) {
    return dummyZonesByWarehouse.get(warehouseId)!
  }
  // Fallback: generate zones if warehouse was created dynamically
  return generateDummyZones(warehouseId, Math.floor(Math.random() * 5) + 5) // 5-10 zones
}

// Helper to get all zones from all warehouses
// This function should be called with the current warehouses list and zones map to include dynamically created/modified zones
export function getAllDummyZones(
  warehouses?: Warehouse[],
  zonesMap?: Map<string, WarehouseZone[]>
): Array<WarehouseZone & { warehouse?: { id: string; name: string; code: string } }> {
  const allZones: Array<WarehouseZone & { warehouse?: { id: string; name: string; code: string } }> = []
  
  // Use provided warehouses list or fall back to initial dummyWarehouses
  const warehousesList = warehouses || dummyWarehouses
  
  warehousesList.forEach(warehouse => {
    // Use zones from map if provided (includes dynamically created/modified zones), otherwise use pre-generated
    const zones = zonesMap?.get(warehouse.id) || getDummyZonesForWarehouse(warehouse.id)
    zones.forEach(zone => {
      allZones.push({
        ...zone,
        warehouse: {
          id: warehouse.id,
          name: warehouse.name,
          code: warehouse.code,
        },
      })
    })
  })
  
  return allZones
}

// Helper to get dummy alerts for a warehouse
export function getDummyAlertsForWarehouse(warehouseId: string, zoneIds: string[] = []): CapacityAlert[] {
  const capacityPercentage = dummyWarehouses.find(w => w.id === warehouseId)?.usedCapacity 
    ? (dummyWarehouses.find(w => w.id === warehouseId)!.usedCapacity / dummyWarehouses.find(w => w.id === warehouseId)!.totalCapacity) * 100
    : 50

  if (capacityPercentage >= 85) {
    return generateDummyCapacityAlerts(warehouseId, zoneIds, Math.floor(Math.random() * 3) + 1)
  }
  return []
}

