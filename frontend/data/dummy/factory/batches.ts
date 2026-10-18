// Dummy data generator for batches
// This file provides realistic dummy data for batch tracking

// Using simple random functions instead of faker for batch generation
// import { faker } from '@faker-js/faker'
import { dummyWarehouses, getAllDummyZones } from './warehouses'
import { dummyProducts } from './warehouse-stock'

export type BatchStatus = 'ACTIVE' | 'EXPIRED' | 'QUARANTINE' | 'CONSUMED'

export interface Batch {
  id: string
  batchNumber: string
  productId: string
  product?: {
    id: string
    name: string
    sku: string
    price: number
    category: string
  }
  warehouseId: string
  warehouse?: {
    id: string
    name: string
    code: string
  }
  zoneId?: string
  zone?: {
    id: string
    name: string
    code: string
  }
  totalQuantity: number
  availableQuantity: number
  // Aliases for compatibility
  quantity?: number
  availableQty?: number
  consumedQuantity: number
  reservedQuantity: number
  manufacturingDate: string
  expiryDate: string
  receivedDate: string
  status: BatchStatus
  qualityStatus?: 'PASSED' | 'FAILED' | 'PENDING' | 'CONDITIONAL'
  qualityCheckDate?: string
  qualityCheckBy?: {
    id: string
    name: string
  }
  receivingRecordId?: string
  supplierId?: string
  supplier?: {
    id: string
    name: string
  }
  notes?: string
  createdAt: string
  updatedAt: string
}

// Generate batch number
function generateBatchNumber(productSku: string, date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const sequence = Math.floor(Math.random() * 999) + 1
  return `${productSku}-${year}${month}${day}-${String(sequence).padStart(3, '0')}`
}

// Calculate days to expiry
function getDaysToExpiry(expiryDate: string): number {
  const expiry = new Date(expiryDate)
  const today = new Date()
  const diffTime = expiry.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}

// Determine batch status based on expiry and quantity
function determineBatchStatus(expiryDate: string, availableQuantity: number, qualityStatus?: string): BatchStatus {
  const daysToExpiry = getDaysToExpiry(expiryDate)

  if (qualityStatus === 'FAILED') {
    return 'QUARANTINE'
  }

  if (daysToExpiry < 0) {
    return 'EXPIRED'
  }

  if (availableQuantity <= 0) {
    return 'CONSUMED'
  }

  return 'ACTIVE'
}

// Generate dummy batches
export function generateDummyBatches(count: number = 80): Batch[] {
  const batches: Batch[] = []

  // Ensure dependencies are available
  let warehouses = dummyWarehouses
  let zones: ReturnType<typeof getAllDummyZones> = []
  let products = dummyProducts

  try {
    if (!warehouses || warehouses.length === 0) {
      console.warn('dummyWarehouses is empty, batches may not have warehouse data')
      warehouses = []
    }

    try {
      zones = getAllDummyZones()
      if (!zones || zones.length === 0) {
        console.warn('getAllDummyZones returned empty array')
        zones = []
      }
    } catch (error) {
      console.warn('Error getting zones:', error)
      zones = []
    }

    if (!products || products.length === 0) {
      console.warn('dummyProducts is empty, batches may not have product data')
      products = []
    }

    // If we have no products or warehouses, return empty array
    if (products.length === 0 || warehouses.length === 0) {
      console.warn('Cannot generate batches without products or warehouses')
      return []
    }
  } catch (error) {
    console.error('Error preparing dependencies for batch generation:', error)
    return []
  }

  const qualityStatuses: Array<'PASSED' | 'FAILED' | 'PENDING' | 'CONDITIONAL' | undefined> = [
    'PASSED', 'PASSED', 'PASSED', 'PASSED', 'PASSED', 'PENDING', 'CONDITIONAL', 'FAILED', undefined
  ]

  // Generate dates - some expiring soon, some expired, some far future
  const today = new Date()
  const dates: Date[] = []

  // Expired batches (10%)
  for (let i = 0; i < Math.floor(count * 0.1); i++) {
    const daysAgo = Math.floor(Math.random() * 90) + 1
    dates.push(new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000))
  }

  // Expiring soon (7-30 days) (20%)
  for (let i = 0; i < Math.floor(count * 0.2); i++) {
    const daysAhead = Math.floor(Math.random() * 24) + 7
    dates.push(new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000))
  }

  // Expiring in 30-90 days (30%)
  for (let i = 0; i < Math.floor(count * 0.3); i++) {
    const daysAhead = Math.floor(Math.random() * 60) + 31
    dates.push(new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000))
  }

  // Expiring in 90+ days (40%)
  for (let i = 0; i < count - dates.length; i++) {
    const daysAhead = Math.floor(Math.random() * 275) + 91
    dates.push(new Date(today.getTime() + daysAhead * 24 * 60 * 60 * 1000))
  }

  // Shuffle dates
  dates.sort(() => Math.random() - 0.5)

  for (let i = 0; i < count; i++) {
    // Safety check: ensure we have products and warehouses
    if (products.length === 0 || warehouses.length === 0) {
      console.warn(`Skipping batch ${i + 1}: missing products or warehouses`)
      continue
    }

    const product = products[Math.floor(Math.random() * products.length)]
    const warehouse = warehouses[Math.floor(Math.random() * warehouses.length)]

    if (!product || !warehouse) {
      console.warn(`Skipping batch ${i + 1}: invalid product or warehouse`)
      continue
    }

    const warehouseZones = zones.filter(z => z.warehouseId === warehouse.id)
    const zone = warehouseZones.length > 0 && Math.random() > 0.2
      ? warehouseZones[Math.floor(Math.random() * warehouseZones.length)]
      : undefined

    // Manufacturing date (30-180 days before expiry)
    const expiryDate = dates[i] || new Date(today.getTime() + (Math.floor(Math.random() * 335) + 30) * 24 * 60 * 60 * 1000)
    const manufacturingDays = Math.floor(Math.random() * 150) + 30
    const manufacturingDate = new Date(expiryDate.getTime() - manufacturingDays * 24 * 60 * 60 * 1000)

    // Received date (0-30 days after manufacturing)
    const receivedDays = Math.floor(Math.random() * 31)
    const receivedDate = new Date(manufacturingDate.getTime() + receivedDays * 24 * 60 * 60 * 1000)

    const batchNumber = generateBatchNumber(product.sku, manufacturingDate)

    // Quantities
    const totalQuantity = Math.floor(Math.random() * 9900) + 100
    const consumedQuantity = Math.floor(Math.random() * Math.floor(totalQuantity * 0.7))
    const reservedQuantity = Math.floor(Math.random() * Math.floor((totalQuantity - consumedQuantity) * 0.3))
    const availableQuantity = totalQuantity - consumedQuantity - reservedQuantity

    // Quality status
    const qualityStatus = qualityStatuses[Math.floor(Math.random() * qualityStatuses.length)]
    const qualityCheckDate = qualityStatus ? new Date(receivedDate.getTime() + Math.floor(Math.random() * 8) * 24 * 60 * 60 * 1000) : undefined

    // Determine status
    const status = determineBatchStatus(expiryDate.toISOString(), availableQuantity, qualityStatus)

    const batch: Batch = {
      id: `batch-${i + 1}`,
      batchNumber,
      productId: product.id,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        price: product.price,
        category: product.category,
      },
      warehouseId: warehouse.id,
      warehouse: {
        id: warehouse.id,
        name: warehouse.name,
        code: warehouse.code,
      },
      zoneId: zone?.id,
      zone: zone ? {
        id: zone.id,
        name: zone.name,
        code: zone.code,
      } : undefined,
      totalQuantity,
      availableQuantity,
      consumedQuantity,
      reservedQuantity,
      manufacturingDate: manufacturingDate.toISOString(),
      expiryDate: expiryDate.toISOString(),
      receivedDate: receivedDate.toISOString(),
      status,
      qualityStatus,
      qualityCheckDate: qualityCheckDate?.toISOString(),
      qualityCheckBy: qualityStatus ? {
        id: `user-${Math.floor(Math.random() * 5) + 1}`,
        name: `User ${Math.floor(Math.random() * 5) + 1}`,
      } : undefined,
      receivingRecordId: `receiving-${Math.floor(Math.random() * 50) + 1}`,
      supplierId: `supplier-${Math.floor(Math.random() * 10) + 1}`,
      supplier: {
        id: `supplier-${Math.floor(Math.random() * 10) + 1}`,
        name: `Supplier ${Math.floor(Math.random() * 10) + 1}`,
      },
      notes: Math.random() > 0.7 ? `Batch notes for ${batchNumber}` : undefined,
      createdAt: receivedDate.toISOString(),
      updatedAt: new Date(receivedDate.getTime() + Math.floor(Math.random() * 31) * 24 * 60 * 60 * 1000).toISOString(),
    }

    batches.push(batch)
  }

  return batches
}

// In-memory storage for dummy batches (lazy initialization)
let dummyBatchesStore: Batch[] | null = null

// Initialize batches store if not already initialized
function initializeBatchesStore(): Batch[] {
  if (!dummyBatchesStore) {
    try {
      // Ensure dependencies are available
      if (!dummyWarehouses || dummyWarehouses.length === 0) {
        console.warn('dummyWarehouses not available, initializing batches with empty warehouses')
      }
      if (!dummyProducts || dummyProducts.length === 0) {
        console.warn('dummyProducts not available, initializing batches with empty products')
      }

      dummyBatchesStore = generateDummyBatches(80)

      // Verify store was created successfully
      if (!dummyBatchesStore || dummyBatchesStore.length === 0) {
        console.warn('Generated batches store is empty, retrying...')
        dummyBatchesStore = generateDummyBatches(80)
      }
    } catch (error) {
      console.error('Error initializing batches store:', error)
      // Retry once
      try {
        dummyBatchesStore = generateDummyBatches(80)
      } catch (retryError) {
        console.error('Retry failed, using empty store:', retryError)
        dummyBatchesStore = []
      }
    }
  }
  return dummyBatchesStore || []
}

// Get all batches with filters
export function getDummyBatches(filters?: {
  productId?: string
  warehouseId?: string
  zoneId?: string
  status?: BatchStatus
  expiringDays?: number
  search?: string
  page?: number
  limit?: number
  sortBy?: 'expiryDate' | 'batchNumber' | 'product' | 'manufacturingDate'
  sortOrder?: 'asc' | 'desc'
}): { data: Batch[]; meta: { total: number; page: number; limit: number; totalPages: number } } {
  const store = initializeBatchesStore()
  let batches = [...store]

  // Apply filters
  if (filters?.productId) {
    batches = batches.filter(b => b.productId === filters.productId)
  }

  if (filters?.warehouseId) {
    batches = batches.filter(b => b.warehouseId === filters.warehouseId)
  }

  if (filters?.zoneId) {
    batches = batches.filter(b => b.zoneId === filters.zoneId)
  }

  if (filters?.status) {
    batches = batches.filter(b => b.status === filters.status)
  }

  if (filters?.expiringDays !== undefined) {
    const today = new Date()
    const targetDate = new Date(today.getTime() + filters.expiringDays * 24 * 60 * 60 * 1000)
    batches = batches.filter(b => {
      const expiry = new Date(b.expiryDate)
      return expiry <= targetDate && expiry >= today
    })
  }

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase()
    batches = batches.filter(b =>
      b.batchNumber.toLowerCase().includes(searchLower) ||
      b.product?.name.toLowerCase().includes(searchLower) ||
      b.product?.sku.toLowerCase().includes(searchLower) ||
      b.warehouse?.name.toLowerCase().includes(searchLower) ||
      b.zone?.name.toLowerCase().includes(searchLower)
    )
  }

  // Sort
  const sortBy = filters?.sortBy || 'expiryDate'
  const sortOrder = filters?.sortOrder || 'asc'

  batches.sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (sortBy) {
      case 'expiryDate':
        aValue = new Date(a.expiryDate).getTime()
        bValue = new Date(b.expiryDate).getTime()
        break
      case 'batchNumber':
        aValue = a.batchNumber
        bValue = b.batchNumber
        break
      case 'product':
        aValue = a.product?.name || ''
        bValue = b.product?.name || ''
        break
      case 'manufacturingDate':
        aValue = new Date(a.manufacturingDate).getTime()
        bValue = new Date(b.manufacturingDate).getTime()
        break
      default:
        aValue = new Date(a.expiryDate).getTime()
        bValue = new Date(b.expiryDate).getTime()
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
    }
  })

  // Pagination
  const page = filters?.page || 1
  const limit = filters?.limit || 20
  const start = (page - 1) * limit
  const end = start + limit
  const paginatedBatches = batches.slice(start, end)

  return {
    data: paginatedBatches,
    meta: {
      total: batches.length,
      page,
      limit,
      totalPages: Math.ceil(batches.length / limit),
    },
  }
}

// Get batch by ID
export function getDummyBatchById(id: string): Batch | undefined {
  const store = initializeBatchesStore()
  return store.find(b => b.id === id)
}

// Get expiring batches
export function getDummyExpiringBatches(days: number = 30): Batch[] {
  try {
    const store = initializeBatchesStore()

    if (!store || store.length === 0) {
      console.warn('Batches store is empty, returning empty array')
      return []
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0) // Normalize to start of day
    const targetDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000)
    targetDate.setHours(23, 59, 59, 999) // End of target day

    const filtered = store.filter(b => {
      if (!b || !b.expiryDate) return false

      const expiry = new Date(b.expiryDate)
      expiry.setHours(0, 0, 0, 0) // Normalize to start of day

      // Include batches that:
      // 1. Are expiring on or before the target date
      // 2. Are expiring on or after today (not already expired too long ago)
      // 3. Have available quantity > 0 (not fully consumed)
      // 4. Are not in QUARANTINE status (unless we want to show those too)
      const isWithinRange = expiry <= targetDate && expiry >= today
      const hasQuantity = b.availableQuantity > 0
      const isRelevant = b.status === 'ACTIVE' || b.status === 'EXPIRED' // Show expired batches too if within range

      return isWithinRange && hasQuantity && isRelevant
    })

    // Sort by expiry date (earliest first)
    filtered.sort((a, b) => {
      const aExpiry = new Date(a.expiryDate).getTime()
      const bExpiry = new Date(b.expiryDate).getTime()
      return aExpiry - bExpiry
    })

    return filtered
  } catch (error) {
    console.error('Error getting expiring batches:', error)
    return []
  }
}

// Update batch
export function updateDummyBatch(id: string, updates: Partial<Batch>): Batch | null {
  const store = initializeBatchesStore()
  const index = store.findIndex(b => b.id === id)
  if (index === -1) return null

  const updated = {
    ...store[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  // Recalculate status if needed
  if (updates.expiryDate || updates.availableQuantity !== undefined || updates.qualityStatus) {
    updated.status = determineBatchStatus(
      updated.expiryDate,
      updated.availableQuantity,
      updated.qualityStatus
    )
  }

  store[index] = updated
  return updated
}

// Create batch
export function createDummyBatch(batch: Omit<Batch, 'id' | 'createdAt' | 'updatedAt'>): Batch {
  const store = initializeBatchesStore()
  const newBatch: Batch = {
    ...batch,
    id: `batch-${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  store.push(newBatch)
  return newBatch
}

// Get batches by product
export function getDummyBatchesByProduct(productId: string): Batch[] {
  const store = initializeBatchesStore()
  return store.filter(b => b.productId === productId && b.status === 'ACTIVE')
}

// Get batches by warehouse
export function getDummyBatchesByWarehouse(warehouseId: string): Batch[] {
  const store = initializeBatchesStore()
  return store.filter(b => b.warehouseId === warehouseId)
}

// Get batches by zone
export function getDummyBatchesByZone(zoneId: string): Batch[] {
  const store = initializeBatchesStore()
  return store.filter(b => b.zoneId === zoneId)
}

// Export store for mutations
export function getDummyBatchesStore(): Batch[] {
  return initializeBatchesStore()
}

// Reset store (for testing)
export function resetDummyBatchesStore(): void {
  dummyBatchesStore = null
  initializeBatchesStore()
}

