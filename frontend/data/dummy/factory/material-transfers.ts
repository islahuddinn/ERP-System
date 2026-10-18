// Dummy data generator for Material Transfers
// This file provides realistic dummy data for testing and development

export type MaterialTransferStatus = 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED'

export interface MaterialTransferItem {
  id: string
  productId?: string
  product: {
    id?: string
    name: string
    code: string
    unit?: string
  }
  batchId?: string
  batch?: {
    id: string
    batchNumber: string
    expiryDate?: string
  }
  quantity: number
  unit?: string
  receivedQuantity?: number
  notes?: string
}

export interface MaterialTransfer {
  id: string
  transferNumber: string
  fromWarehouseId: string
  fromWarehouse: {
    id: string
    name: string
    code: string
  }
  fromZoneId?: string
  fromZone?: {
    id: string
    name: string
    code: string
  }
  toWarehouseId: string
  toWarehouse: {
    id: string
    name: string
    code: string
  }
  toZoneId?: string
  toZone?: {
    id: string
    name: string
    code: string
  }
  transferDate: string
  expectedDeliveryDate?: string
  receivedDate?: string
  status: MaterialTransferStatus
  items: MaterialTransferItem[]
  itemsCount: number
  totalQuantity: number
  notes?: string
  createdById: string
  receivedById?: string
  createdAt: string
  updatedAt: string
}

// Dummy products
const dummyProducts = [
  { id: 'prod-1', name: 'Steel Sheets', code: 'STL-001', unit: 'KG' },
  { id: 'prod-2', name: 'Aluminum Rods', code: 'ALM-002', unit: 'KG' },
  { id: 'prod-3', name: 'Plastic Pellets', code: 'PLA-003', unit: 'KG' },
  { id: 'prod-4', name: 'Copper Wire', code: 'COP-004', unit: 'M' },
  { id: 'prod-5', name: 'Rubber Gaskets', code: 'RUB-005', unit: 'UNIT' },
  { id: 'prod-6', name: 'Glass Panels', code: 'GLS-006', unit: 'UNIT' },
  { id: 'prod-7', name: 'Wood Planks', code: 'WOD-007', unit: 'M' },
  { id: 'prod-8', name: 'Paint Base', code: 'PNT-008', unit: 'L' },
  { id: 'prod-9', name: 'Screws M6', code: 'SCR-009', unit: 'UNIT' },
  { id: 'prod-10', name: 'Bolts M8', code: 'BLT-010', unit: 'UNIT' },
]

// Dummy warehouses
const dummyWarehouses = [
  { id: 'wh-1', name: 'Main Storage Warehouse', code: 'WH-001' },
  { id: 'wh-2', name: 'North Warehouse', code: 'WH-002' },
  { id: 'wh-3', name: 'South Distribution', code: 'WH-003' },
  { id: 'wh-4', name: 'East Storage', code: 'WH-004' },
  { id: 'wh-5', name: 'West Facility', code: 'WH-005' },
]

// Dummy zones
const dummyZones = [
  { id: 'zone-1', name: 'Zone A', code: 'Z-A' },
  { id: 'zone-2', name: 'Zone B', code: 'Z-B' },
  { id: 'zone-3', name: 'Zone C', code: 'Z-C' },
  { id: 'zone-4', name: 'Zone D', code: 'Z-D' },
]

// Dummy users
const dummyUsers = [
  { id: 'user-1', name: 'John Smith', email: 'john.smith@factory.com' },
  { id: 'user-2', name: 'Sarah Johnson', email: 'sarah.j@factory.com' },
  { id: 'user-3', name: 'Michael Brown', email: 'michael.b@factory.com' },
  { id: 'user-4', name: 'Emily Davis', email: 'emily.d@factory.com' },
  { id: 'user-5', name: 'David Wilson', email: 'david.w@factory.com' },
]

const statuses: MaterialTransferStatus[] = ['PENDING', 'IN_TRANSIT', 'RECEIVED', 'COMPLETED', 'CANCELLED']

export function generateDummyMaterialTransfers(count: number = 25): MaterialTransfer[] {
  const transfers: MaterialTransfer[] = []

  for (let i = 1; i <= count; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const fromWarehouse = dummyWarehouses[Math.floor(Math.random() * dummyWarehouses.length)]
    let toWarehouse = dummyWarehouses[Math.floor(Math.random() * dummyWarehouses.length)]
    // Ensure from and to are different
    while (toWarehouse.id === fromWarehouse.id) {
      toWarehouse = dummyWarehouses[Math.floor(Math.random() * dummyWarehouses.length)]
    }

    const fromZone = Math.random() > 0.5 ? dummyZones[Math.floor(Math.random() * dummyZones.length)] : undefined
    const toZone = Math.random() > 0.5 ? dummyZones[Math.floor(Math.random() * dummyZones.length)] : undefined

    // Generate items (3-10 items per transfer)
    const itemsCount = Math.floor(Math.random() * 8) + 3
    const items: MaterialTransferItem[] = []
    let totalQuantity = 0

    for (let j = 0; j < itemsCount; j++) {
      const product = dummyProducts[Math.floor(Math.random() * dummyProducts.length)]
      const quantity = Math.floor(Math.random() * 500) + 10
      totalQuantity += quantity

      const hasBatch = Math.random() > 0.3
      const batch = hasBatch ? {
        id: `batch-${i}-${j}`,
        batchNumber: `BATCH-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        expiryDate: Math.random() > 0.5 ? new Date(Date.now() + Math.random() * 2 * 365 * 24 * 60 * 60 * 1000).toISOString() : undefined,
      } : undefined

      items.push({
        id: `item-${i}-${j}`,
        productId: product.id,
        product: {
          id: product.id,
          name: product.name,
          code: product.code,
          unit: product.unit,
        },
        batchId: batch?.id,
        batch,
        quantity,
        unit: product.unit,
        receivedQuantity: status === 'RECEIVED' || status === 'COMPLETED'
          ? quantity - Math.floor(Math.random() * 5) // Allow small discrepancies
          : undefined,
        notes: Math.random() > 0.7 ? 'Special handling required' : undefined,
      })
    }

    const transferDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    const expectedDeliveryDate = new Date(transferDate.getTime() + Math.random() * 7 * 24 * 60 * 60 * 1000)
    const receivedDate = status === 'RECEIVED' || status === 'COMPLETED'
      ? new Date(transferDate.getTime() + Math.random() * (expectedDeliveryDate.getTime() - transferDate.getTime()))
      : undefined

    const createdById = dummyUsers[Math.floor(Math.random() * dummyUsers.length)].id
    const receivedById = status === 'RECEIVED' || status === 'COMPLETED'
      ? dummyUsers[Math.floor(Math.random() * dummyUsers.length)].id
      : undefined

    const transfer: MaterialTransfer = {
      id: `mt-${i.toString().padStart(4, '0')}`,
      transferNumber: `MT-${new Date().getFullYear()}-${i.toString().padStart(5, '0')}`,
      fromWarehouseId: fromWarehouse.id,
      fromWarehouse,
      fromZoneId: fromZone?.id,
      fromZone,
      toWarehouseId: toWarehouse.id,
      toWarehouse,
      toZoneId: toZone?.id,
      toZone,
      transferDate: transferDate.toISOString(),
      expectedDeliveryDate: expectedDeliveryDate.toISOString(),
      receivedDate: receivedDate?.toISOString(),
      status,
      items,
      itemsCount: items.length,
      totalQuantity,
      notes: Math.random() > 0.5 ? 'Transfer notes and special instructions' : undefined,
      createdById,
      receivedById,
      createdAt: transferDate.toISOString(),
      updatedAt: new Date().toISOString(),
    }

    transfers.push(transfer)
  }

  return transfers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// In-memory storage for dummy material transfers (lazy initialization)
let dummyTransfersStore: MaterialTransfer[] | null = null

// Initialize transfers store if not already initialized
function initializeTransfersStore() {
  if (!dummyTransfersStore) {
    try {
      dummyTransfersStore = generateDummyMaterialTransfers(25)
    } catch (error) {
      console.error('Error initializing material transfers store:', error)
      dummyTransfersStore = []
    }
  }
  return dummyTransfersStore
}

export function getMaterialTransferById(id: string): MaterialTransfer | undefined {
  const store = initializeTransfersStore()
  return store.find(t => t.id === id)
}

// Get all transfers with filters (using store)
export function getDummyMaterialTransfers(filters?: {
  search?: string
  status?: MaterialTransferStatus
  fromWarehouseId?: string
  toWarehouseId?: string
  productId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}): { data: MaterialTransfer[]; meta: { total: number; page: number; limit: number; totalPages: number } } {
  const store = initializeTransfersStore()
  let transfers = [...store]

  // Apply filters
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase()
    transfers = transfers.filter(t =>
      t.transferNumber.toLowerCase().includes(searchLower) ||
      t.fromWarehouse.name.toLowerCase().includes(searchLower) ||
      t.toWarehouse.name.toLowerCase().includes(searchLower) ||
      t.items.some(item => item.product.name.toLowerCase().includes(searchLower))
    )
  }

  if (filters?.status) {
    transfers = transfers.filter(t => t.status === filters.status)
  }

  if (filters?.fromWarehouseId) {
    transfers = transfers.filter(t => t.fromWarehouseId === filters.fromWarehouseId)
  }

  if (filters?.toWarehouseId) {
    transfers = transfers.filter(t => t.toWarehouseId === filters.toWarehouseId)
  }

  if (filters?.productId) {
    transfers = transfers.filter(t => t.items.some(item => item.productId === filters.productId))
  }

  if (filters?.dateFrom) {
    transfers = transfers.filter(t => new Date(t.transferDate) >= new Date(filters.dateFrom!))
  }

  if (filters?.dateTo) {
    transfers = transfers.filter(t => new Date(t.transferDate) <= new Date(filters.dateTo!))
  }

  // Pagination
  const page = filters?.page || 1
  const limit = filters?.limit || 20
  const total = transfers.length
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedTransfers = transfers.slice(startIndex, endIndex)

  return {
    data: paginatedTransfers,
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  }
}

// Create material transfer
export function createDummyMaterialTransfer(data: Omit<MaterialTransfer, 'id' | 'transferNumber' | 'createdAt' | 'updatedAt'>): MaterialTransfer {
  const store = initializeTransfersStore()
  const transferNumber = `MT-${new Date().getFullYear()}-${String(store.length + 1).padStart(5, '0')}`
  const newTransfer: MaterialTransfer = {
    ...data,
    id: `mt-${Date.now()}`,
    transferNumber,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  store.push(newTransfer)
  return newTransfer
}

// Update material transfer status
export function updateDummyMaterialTransferStatus(
  id: string,
  status: MaterialTransferStatus
): MaterialTransfer | null {
  const store = initializeTransfersStore()
  const index = store.findIndex(t => t.id === id)
  if (index === -1) return null

  const updated: MaterialTransfer = {
    ...store[index],
    status,
    updatedAt: new Date().toISOString(),
    receivedDate: status === 'RECEIVED' || status === 'COMPLETED' ? new Date().toISOString() : store[index].receivedDate,
  }

  store[index] = updated
  return updated
}

// Export store for mutations
export function getDummyMaterialTransfersStore(): MaterialTransfer[] {
  return initializeTransfersStore()
}

