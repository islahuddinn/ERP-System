// Dummy data generator for production orders
// This file provides realistic dummy data for production orders

import { getDummyPlants, getDummyProductionLines } from './plants'
import { dummyProducts } from './warehouse-stock'
import { dummyWarehouses } from './warehouses'
import { getDummyBatches } from './batches'

export type ProductionOrderStatus = 'DRAFT' | 'APPROVED' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'all'

export interface MaterialIssue {
  id: string
  materialId: string
  material: {
    id: string
    name: string
    sku: string
    unit: string
  }
  batchId?: string
  batch?: {
    id: string
    batchNumber: string
  }
  requiredQuantity: number
  issuedQuantity: number
  warehouseId: string
  warehouse?: {
    id: string
    name: string
  }
  zoneId?: string
  zone?: {
    id: string
    name: string
  }
  issuedAt?: string
  issuedBy?: {
    id: string
    name: string
  }
}

export interface ProductionProgress {
  completedQuantity: number
  plannedQuantity: number
  percentage: number
  lastUpdated: string
  qualityChecks: number
  wasteRecords: number
  wasteQuantity: number
}

export interface FinishedGoodsBatch {
  id: string
  batchNumber: string
  quantity: number
  warehouseId: string
  warehouse?: {
    id: string
    name: string
  }
  zoneId?: string
  zone?: {
    id: string
    name: string
  }
  createdAt: string
}

export interface ProductionOrder {
  id: string
  orderNumber: string
  workOrderId?: string
  workOrder?: {
    id: string
    orderNumber: string
  }
  productId: string
  product: {
    id: string
    name: string
    sku: string
    category: string
  }
  plannedQuantity: number
  completedQuantity: number
  plantId: string
  plant: {
    id: string
    name: string
    code: string
  }
  productionLineId?: string
  productionLine?: {
    id: string
    name: string
    code: string
  }
  startDate?: string
  endDate?: string
  plannedStartDate?: string
  plannedEndDate?: string
  status: ProductionOrderStatus
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  materialIssues: MaterialIssue[]
  progress: ProductionProgress
  finishedGoodsBatches: FinishedGoodsBatch[]
  notes?: string
  createdById: string
  createdAt: string
  updatedAt: string
}

// Generate production order number
function generateOrderNumber(index: number): string {
  const year = new Date().getFullYear()
  const month = String(new Date().getMonth() + 1).padStart(2, '0')
  const sequence = String(index).padStart(4, '0')
  return `PO-${year}${month}-${sequence}`
}

// Generate dummy production orders
export function generateDummyProductionOrders(count: number = 50): ProductionOrder[] {
  const orders: ProductionOrder[] = []
  const statuses: ProductionOrderStatus[] = ['DRAFT', 'APPROVED', 'PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']
  const priorities: Array<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'> = ['LOW', 'MEDIUM', 'MEDIUM', 'HIGH', 'URGENT']

  const plants = getDummyPlants({ limit: 100 }).data
  const productionLines = getDummyProductionLines({ limit: 100 }).data
  const batches = getDummyBatches({ limit: 100 }).data

  for (let i = 1; i <= count; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const priority = priorities[Math.floor(Math.random() * priorities.length)]
    const product = dummyProducts[Math.floor(Math.random() * dummyProducts.length)]
    const plant = plants[Math.floor(Math.random() * plants.length)]
    const plantLines = productionLines.filter(l => l.plantId === plant.id)
    const productionLine = plantLines.length > 0 && Math.random() > 0.3
      ? plantLines[Math.floor(Math.random() * plantLines.length)]
      : undefined

    const today = new Date()
    const plannedStartDate = new Date(today.getTime() - Math.random() * 60 * 24 * 60 * 60 * 1000)
    const plannedEndDate = new Date(plannedStartDate.getTime() + (Math.floor(Math.random() * 30) + 5) * 24 * 60 * 60 * 1000)

    let startDate: string | undefined
    let endDate: string | undefined

    if (status === 'IN_PROGRESS' || status === 'COMPLETED') {
      startDate = new Date(plannedStartDate.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString()
    }

    if (status === 'COMPLETED') {
      endDate = new Date(startDate ? new Date(startDate).getTime() : plannedEndDate.getTime() + Math.random() * 10 * 24 * 60 * 60 * 1000).toISOString()
    }

    const plannedQuantity = Math.floor(Math.random() * 900) + 100 // 100-1000
    const completedQuantity = status === 'COMPLETED'
      ? plannedQuantity - Math.floor(Math.random() * Math.floor(plannedQuantity * 0.1)) // 90-100% of planned
      : status === 'IN_PROGRESS'
        ? Math.floor(Math.random() * Math.floor(plannedQuantity * 0.8)) // 0-80% of planned
        : 0

    const progressPercentage = plannedQuantity > 0 ? Math.round((completedQuantity / plannedQuantity) * 100) : 0

    // Generate material issues (from BOM)
    const materialIssues: MaterialIssue[] = []
    const materialCount = Math.floor(Math.random() * 5) + 2 // 2-6 materials

    for (let j = 0; j < materialCount; j++) {
      const material = dummyProducts[Math.floor(Math.random() * dummyProducts.length)]
      const warehouse = dummyWarehouses[Math.floor(Math.random() * dummyWarehouses.length)]
      const materialBatches = batches.filter(b => b.productId === material.id && b.warehouseId === warehouse.id)
      const batch = materialBatches.length > 0 && Math.random() > 0.3
        ? materialBatches[Math.floor(Math.random() * materialBatches.length)]
        : undefined

      const requiredQuantity = Math.floor(Math.random() * 500) + 50
      const issuedQuantity = status === 'IN_PROGRESS' || status === 'COMPLETED'
        ? Math.floor(Math.random() * requiredQuantity) + Math.floor(requiredQuantity * 0.7) // 70-100% issued
        : 0

      materialIssues.push({
        id: `issue-${i}-${j}`,
        materialId: material.id,
        material: {
          id: material.id,
          name: material.name,
          sku: material.sku,
          unit: 'KG',
        },
        batchId: batch?.id,
        batch: batch ? {
          id: batch.id,
          batchNumber: batch.batchNumber,
        } : undefined,
        requiredQuantity,
        issuedQuantity,
        warehouseId: warehouse.id,
        warehouse: {
          id: warehouse.id,
          name: warehouse.name,
        },
        issuedAt: issuedQuantity > 0 ? new Date(plannedStartDate.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000).toISOString() : undefined,
        issuedBy: issuedQuantity > 0 ? {
          id: 'user-1',
          name: 'John Doe',
        } : undefined,
      })
    }

    // Generate finished goods batches
    const finishedGoodsBatches: FinishedGoodsBatch[] = []
    if (status === 'COMPLETED' && completedQuantity > 0) {
      const batchCount = Math.floor(Math.random() * 3) + 1 // 1-3 batches
      const quantityPerBatch = Math.floor(completedQuantity / batchCount)

      for (let k = 0; k < batchCount; k++) {
        const dispatchWarehouse = dummyWarehouses[Math.floor(Math.random() * dummyWarehouses.length)]
        finishedGoodsBatches.push({
          id: `fg-batch-${i}-${k}`,
          batchNumber: `FG-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(i).padStart(4, '0')}-${String(k + 1).padStart(2, '0')}`,
          quantity: k === batchCount - 1 ? completedQuantity - (quantityPerBatch * (batchCount - 1)) : quantityPerBatch,
          warehouseId: dispatchWarehouse.id,
          warehouse: {
            id: dispatchWarehouse.id,
            name: dispatchWarehouse.name,
          },
          createdAt: endDate || new Date().toISOString(),
        })
      }
    }

    const order: ProductionOrder = {
      id: `po-${i}`,
      orderNumber: generateOrderNumber(i),
      workOrderId: Math.random() > 0.5 ? `wo-${Math.floor(Math.random() * 20) + 1}` : undefined,
      workOrder: Math.random() > 0.5 ? {
        id: `wo-${Math.floor(Math.random() * 20) + 1}`,
        orderNumber: `WO-2024-${String(Math.floor(Math.random() * 100) + 1).padStart(3, '0')}`,
      } : undefined,
      productId: product.id,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        category: product.category,
      },
      plannedQuantity,
      completedQuantity,
      plantId: plant.id,
      plant: {
        id: plant.id,
        name: plant.name,
        code: plant.code,
      },
      productionLineId: productionLine?.id,
      productionLine: productionLine ? {
        id: productionLine.id,
        name: productionLine.name,
        code: productionLine.code,
      } : undefined,
      startDate,
      endDate,
      plannedStartDate: plannedStartDate.toISOString(),
      plannedEndDate: plannedEndDate.toISOString(),
      status,
      priority,
      materialIssues,
      progress: {
        completedQuantity,
        plannedQuantity,
        percentage: progressPercentage,
        lastUpdated: status === 'IN_PROGRESS' || status === 'COMPLETED'
          ? new Date().toISOString()
          : plannedStartDate.toISOString(),
        qualityChecks: status === 'COMPLETED' ? Math.floor(Math.random() * 5) + 1 : 0,
        wasteRecords: status === 'COMPLETED' ? Math.floor(Math.random() * 3) : 0,
        wasteQuantity: status === 'COMPLETED' ? Math.floor(Math.random() * Math.floor(plannedQuantity * 0.05)) : 0,
      },
      finishedGoodsBatches,
      notes: Math.random() > 0.7 ? `Production notes for order ${generateOrderNumber(i)}` : undefined,
      createdById: 'user-1',
      createdAt: plannedStartDate.toISOString(),
      updatedAt: new Date(plannedStartDate.getTime() + Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    }

    orders.push(order)
  }

  return orders
}

// In-memory storage for dummy production orders (lazy initialization)
let dummyProductionOrdersStore: ProductionOrder[] | null = null

// Initialize production orders store if not already initialized
function initializeProductionOrdersStore(): ProductionOrder[] {
  if (!dummyProductionOrdersStore) {
    try {
      dummyProductionOrdersStore = generateDummyProductionOrders(50)
    } catch (error) {
      console.error('Error initializing production orders store:', error)
      dummyProductionOrdersStore = []
    }
  }
  return dummyProductionOrdersStore || []
}

// Get all production orders with filters
export function getDummyProductionOrders(filters?: {
  status?: ProductionOrderStatus
  plantId?: string
  productionLineId?: string
  productId?: string
  priority?: string
  search?: string
  page?: number
  limit?: number
}): { data: ProductionOrder[]; meta: { total: number; page: number; limit: number; totalPages: number } } {
  const store = initializeProductionOrdersStore()
  let orders = [...store]

  // Apply filters
  if (filters?.status) {
    orders = orders.filter(o => o.status === filters.status)
  }

  if (filters?.plantId) {
    orders = orders.filter(o => o.plantId === filters.plantId)
  }

  if (filters?.productionLineId) {
    orders = orders.filter(o => o.productionLineId === filters.productionLineId)
  }

  if (filters?.productId) {
    orders = orders.filter(o => o.productId === filters.productId)
  }

  if (filters?.priority) {
    orders = orders.filter(o => o.priority === filters.priority)
  }

  if (filters?.search) {
    const searchLower = filters.search.toLowerCase()
    orders = orders.filter(o =>
      o.orderNumber.toLowerCase().includes(searchLower) ||
      o.product.name.toLowerCase().includes(searchLower) ||
      o.product.sku.toLowerCase().includes(searchLower) ||
      o.plant.name.toLowerCase().includes(searchLower) ||
      o.productionLine?.name.toLowerCase().includes(searchLower)
    )
  }

  // Pagination
  const page = filters?.page || 1
  const limit = filters?.limit || 20
  const total = orders.length
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedOrders = orders.slice(startIndex, endIndex)

  return {
    data: paginatedOrders,
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  }
}

// Get production order by ID
export function getDummyProductionOrderById(id: string): ProductionOrder | undefined {
  const store = initializeProductionOrdersStore()
  return store.find(o => o.id === id)
}

// Create production order
export function createDummyProductionOrder(order: Omit<ProductionOrder, 'id' | 'orderNumber' | 'createdAt' | 'updatedAt'>): ProductionOrder {
  const store = initializeProductionOrdersStore()
  const newOrder: ProductionOrder = {
    ...order,
    id: `po-${Date.now()}`,
    orderNumber: generateOrderNumber(store.length + 1),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  store.push(newOrder)
  return newOrder
}

// Update production order
export function updateDummyProductionOrder(id: string, updates: Partial<ProductionOrder>): ProductionOrder | null {
  const store = initializeProductionOrdersStore()
  const index = store.findIndex(o => o.id === id)
  if (index === -1) return null

  const updated = {
    ...store[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }

  // Recalculate progress if quantities changed
  if (updates.completedQuantity !== undefined || updates.plannedQuantity !== undefined) {
    const completed = updates.completedQuantity ?? updated.completedQuantity
    const planned = updates.plannedQuantity ?? updated.plannedQuantity
    updated.progress = {
      ...updated.progress,
      completedQuantity: completed,
      plannedQuantity: planned,
      percentage: planned > 0 ? Math.round((completed / planned) * 100) : 0,
      lastUpdated: new Date().toISOString(),
    }
  }

  store[index] = updated
  return updated
}

// Delete production order
export function deleteDummyProductionOrder(id: string): boolean {
  const store = initializeProductionOrdersStore()
  const index = store.findIndex(o => o.id === id)
  if (index === -1) return false

  store.splice(index, 1)
  return true
}

// Export store for mutations
export function getDummyProductionOrdersStore(): ProductionOrder[] {
  return initializeProductionOrdersStore()
}

