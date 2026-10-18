// Dummy data generator for Material Requests
// This file provides realistic dummy data for testing and development

export type MaterialRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED' | 'CANCELLED' | 'DRAFT'
export type MaterialRequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface MaterialRequestItem {
  id: string
  productId: string
  product: {
    id: string
    name: string
    code: string
    unit: string
  }
  quantity: number
  unit: string
  availableStock?: number
  notes?: string
}

export interface MaterialRequest {
  id: string
  requestNumber: string
  requestedById: string
  requestDate: string
  requiredDate?: string
  plantId?: string
  plant?: {
    id: string
    name: string
    code: string
  }
  warehouseId?: string
  warehouse?: {
    id: string
    name: string
    code: string
  }
  status: MaterialRequestStatus
  priority: MaterialRequestPriority
  items: MaterialRequestItem[]
  itemsCount: number
  totalQuantity: number
  notes?: string
  approvedById?: string
  approvedAt?: string
  rejectedById?: string
  rejectedAt?: string
  rejectionReason?: string
  fulfilledById?: string
  fulfilledAt?: string
  createdAt: string
  updatedAt: string
  statusHistory?: Array<{
    status: MaterialRequestStatus
    changedById: string
    changedAt: string
    notes?: string
  }>
}

// Dummy products for material requests
export const dummyProducts = [
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
  { id: 'prod-11', name: 'Nuts M8', code: 'NUT-011', unit: 'UNIT' },
  { id: 'prod-12', name: 'Washers', code: 'WSH-012', unit: 'UNIT' },
  { id: 'prod-13', name: 'Adhesive', code: 'ADH-013', unit: 'L' },
  { id: 'prod-14', name: 'Sealant', code: 'SEL-014', unit: 'L' },
  { id: 'prod-15', name: 'Insulation Foam', code: 'INS-015', unit: 'M2' },
]

// Dummy users
const dummyUsers = [
  { id: 'user-1', name: 'John Smith', email: 'john.smith@factory.com' },
  { id: 'user-2', name: 'Sarah Johnson', email: 'sarah.j@factory.com' },
  { id: 'user-3', name: 'Michael Brown', email: 'michael.b@factory.com' },
  { id: 'user-4', name: 'Emily Davis', email: 'emily.d@factory.com' },
  { id: 'user-5', name: 'David Wilson', email: 'david.w@factory.com' },
  { id: 'user-6', name: 'Lisa Anderson', email: 'lisa.a@factory.com' },
  { id: 'user-7', name: 'Robert Taylor', email: 'robert.t@factory.com' },
]

// Dummy warehouses
const dummyWarehouses = [
  { id: 'wh-1', name: 'Main Storage Warehouse', code: 'WH-001' },
  { id: 'wh-2', name: 'North Warehouse', code: 'WH-002' },
  { id: 'wh-3', name: 'South Distribution', code: 'WH-003' },
  { id: 'wh-4', name: 'East Storage', code: 'WH-004' },
]

// Dummy plants
const dummyPlants = [
  { id: 'plant-1', name: 'Main Production Plant', code: 'PLT-001' },
  { id: 'plant-2', name: 'Secondary Plant', code: 'PLT-002' },
  { id: 'plant-3', name: 'Assembly Plant', code: 'PLT-003' },
]

const statuses: MaterialRequestStatus[] = ['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED', 'CANCELLED', 'DRAFT']
const priorities: MaterialRequestPriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

export function generateDummyMaterialRequests(count: number = 35): MaterialRequest[] {
  const requests: MaterialRequest[] = []
  
  for (let i = 1; i <= count; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const priority = priorities[Math.floor(Math.random() * priorities.length)]
    const requestedBy = dummyUsers[Math.floor(Math.random() * dummyUsers.length)]
    const isPlantRequest = Math.random() > 0.5
    const plant = isPlantRequest ? dummyPlants[Math.floor(Math.random() * dummyPlants.length)] : undefined
    const warehouse = !isPlantRequest ? dummyWarehouses[Math.floor(Math.random() * dummyWarehouses.length)] : undefined
    
    // Generate items (5-15 items per request)
    const itemsCount = Math.floor(Math.random() * 11) + 5
    const items: MaterialRequestItem[] = []
    let totalQuantity = 0
    
    for (let j = 0; j < itemsCount; j++) {
      const product = dummyProducts[Math.floor(Math.random() * dummyProducts.length)]
      const quantity = Math.floor(Math.random() * 1000) + 10
      totalQuantity += quantity
      
      items.push({
        id: `item-${i}-${j}`,
        productId: product.id,
        product: {
          id: product.id,
          name: product.name,
          code: product.code,
          unit: product.unit,
        },
        quantity,
        unit: product.unit,
        availableStock: Math.floor(Math.random() * 2000) + quantity,
        notes: Math.random() > 0.7 ? 'Additional notes for this item' : undefined,
      })
    }
    
    const requestDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    const requiredDate = Math.random() > 0.3 ? new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000) : undefined
    
    // Generate status history
    const statusHistory: MaterialRequest['statusHistory'] = [
      {
        status: 'DRAFT',
        changedById: requestedBy.id,
        changedAt: requestDate.toISOString(),
      },
    ]

    if (status !== 'DRAFT') {
      statusHistory.push({
        status: 'PENDING',
        changedById: requestedBy.id,
        changedAt: new Date(requestDate.getTime() + 1000 * 60 * 60).toISOString(),
      })
    }
    
    if (status === 'APPROVED' || status === 'FULFILLED') {
      const approvedById = dummyUsers[Math.floor(Math.random() * dummyUsers.length)].id
      const approvedAt = new Date(requestDate.getTime() + 1000 * 60 * 60 * 24)
      statusHistory.push({
        status: 'APPROVED',
        changedById: approvedById,
        changedAt: approvedAt.toISOString(),
      })
    }

    if (status === 'REJECTED') {
      const rejectedById = dummyUsers[Math.floor(Math.random() * dummyUsers.length)].id
      const rejectedAt = new Date(requestDate.getTime() + 1000 * 60 * 60 * 24)
      statusHistory.push({
        status: 'REJECTED',
        changedById: rejectedById,
        changedAt: rejectedAt.toISOString(),
        notes: 'Rejection reason: Insufficient stock or budget constraints',
      })
    }
    
    if (status === 'FULFILLED') {
      const fulfilledById = dummyUsers[Math.floor(Math.random() * dummyUsers.length)].id
      const fulfilledAt = new Date(requestDate.getTime() + 1000 * 60 * 60 * 48)
      statusHistory.push({
        status: 'FULFILLED',
        changedById: fulfilledById,
        changedAt: fulfilledAt.toISOString(),
      })
    }
    
    const request: MaterialRequest = {
      id: `mr-${i.toString().padStart(4, '0')}`,
      requestNumber: `MR-${new Date().getFullYear()}-${i.toString().padStart(5, '0')}`,
      requestedById: requestedBy.id,
      requestDate: requestDate.toISOString(),
      requiredDate: requiredDate?.toISOString(),
      plantId: plant?.id,
      plant,
      warehouseId: warehouse?.id,
      warehouse,
      status,
      priority,
      items,
      itemsCount: items.length,
      totalQuantity,
      notes: Math.random() > 0.5 ? 'Additional notes and requirements for this material request' : undefined,
      approvedById: status === 'APPROVED' || status === 'FULFILLED'
        ? dummyUsers[Math.floor(Math.random() * dummyUsers.length)].id
        : undefined,
      approvedAt: status === 'APPROVED' || status === 'FULFILLED'
        ? new Date(requestDate.getTime() + 1000 * 60 * 60 * 24).toISOString()
        : undefined,
      rejectedById: status === 'REJECTED' ? dummyUsers[Math.floor(Math.random() * dummyUsers.length)].id : undefined,
      rejectedAt: status === 'REJECTED'
        ? new Date(requestDate.getTime() + 1000 * 60 * 60 * 24).toISOString()
        : undefined,
      rejectionReason: status === 'REJECTED' ? 'Insufficient budget or stock unavailable' : undefined,
      fulfilledById: status === 'FULFILLED'
        ? dummyUsers[Math.floor(Math.random() * dummyUsers.length)].id
        : undefined,
      fulfilledAt: status === 'FULFILLED'
        ? new Date(requestDate.getTime() + 1000 * 60 * 60 * 48).toISOString()
        : undefined,
      createdAt: requestDate.toISOString(),
      updatedAt: new Date().toISOString(),
      statusHistory,
    }
    
    requests.push(request)
  }
  
  return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// In-memory storage for dummy material requests (lazy initialization)
let dummyRequestsStore: MaterialRequest[] | null = null

// Initialize requests store if not already initialized
function initializeRequestsStore() {
  if (!dummyRequestsStore) {
    try {
      dummyRequestsStore = generateDummyMaterialRequests(35)
    } catch (error) {
      console.error('Error initializing material requests store:', error)
      dummyRequestsStore = []
    }
  }
  return dummyRequestsStore
}

export function getMaterialRequestById(id: string): MaterialRequest | undefined {
  const store = initializeRequestsStore()
  return store.find(r => r.id === id)
}

// Get all requests with filters (using store)
export function getDummyMaterialRequests(filters?: {
  search?: string
  status?: MaterialRequestStatus
  priority?: MaterialRequestPriority
  requestedBy?: string
  plantId?: string
  warehouseId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}): { data: MaterialRequest[]; meta: { total: number; page: number; limit: number; totalPages: number } } {
  const store = initializeRequestsStore()
  let requests = [...store]
  
  // Apply filters
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase()
    requests = requests.filter(r =>
      r.requestNumber.toLowerCase().includes(searchLower) ||
      r.items.some(item => item.product.name.toLowerCase().includes(searchLower))
    )
  }
  
  if (filters?.status) {
    requests = requests.filter(r => r.status === filters.status)
  }
  
  if (filters?.priority) {
    requests = requests.filter(r => r.priority === filters.priority)
  }
  
  if (filters?.requestedBy) {
    requests = requests.filter(r => r.requestedById === filters.requestedBy)
  }
  
  if (filters?.plantId) {
    requests = requests.filter(r => r.plantId === filters.plantId)
  }
  
  if (filters?.warehouseId) {
    requests = requests.filter(r => r.warehouseId === filters.warehouseId)
  }
  
  if (filters?.dateFrom) {
    requests = requests.filter(r => new Date(r.requestDate) >= new Date(filters.dateFrom!))
  }
  
  if (filters?.dateTo) {
    requests = requests.filter(r => new Date(r.requestDate) <= new Date(filters.dateTo!))
  }
  
  // Pagination
  const page = filters?.page || 1
  const limit = filters?.limit || 20
  const total = requests.length
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedRequests = requests.slice(startIndex, endIndex)
  
  return {
    data: paginatedRequests,
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  }
}

// Create material request
export function createDummyMaterialRequest(data: Omit<MaterialRequest, 'id' | 'requestNumber' | 'createdAt' | 'updatedAt' | 'statusHistory'>): MaterialRequest {
  const store = initializeRequestsStore()
  const requestNumber = `MR-${new Date().getFullYear()}-${String(store.length + 1).padStart(5, '0')}`
  const newRequest: MaterialRequest = {
    ...data,
    id: `mr-${Date.now()}`,
    requestNumber,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    statusHistory: [{
      status: data.status,
      changedById: data.requestedById,
      changedAt: new Date().toISOString(),
    }],
  }
  
  store.push(newRequest)
  return newRequest
}

// Update material request
export function updateDummyMaterialRequest(id: string, updates: Partial<MaterialRequest>): MaterialRequest | null {
  const store = initializeRequestsStore()
  const index = store.findIndex(r => r.id === id)
  if (index === -1) return null
  
  const updated = {
    ...store[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  }
  
  store[index] = updated
  return updated
}

// Update request status
export function updateDummyMaterialRequestStatus(
  id: string,
  status: MaterialRequestStatus,
  changedById: string,
  notes?: string
): MaterialRequest | null {
  const store = initializeRequestsStore()
  const index = store.findIndex(r => r.id === id)
  if (index === -1) return null

  const request = store[index]
  const statusHistory = request.statusHistory || []
  statusHistory.push({
    status,
    changedById,
    changedAt: new Date().toISOString(),
    notes,
  })

  const updated: MaterialRequest = {
    ...request,
    status,
    updatedAt: new Date().toISOString(),
    statusHistory,
    approvedById: status === 'APPROVED' || status === 'FULFILLED' ? changedById : request.approvedById,
    approvedAt: status === 'APPROVED' || status === 'FULFILLED' ? new Date().toISOString() : request.approvedAt,
    rejectedById: status === 'REJECTED' ? changedById : request.rejectedById,
    rejectedAt: status === 'REJECTED' ? new Date().toISOString() : request.rejectedAt,
    fulfilledById: status === 'FULFILLED' ? changedById : request.fulfilledById,
    fulfilledAt: status === 'FULFILLED' ? new Date().toISOString() : request.fulfilledAt,
  }
  
  store[index] = updated
  return updated
}

// Export store for mutations
export function getDummyMaterialRequestsStore(): MaterialRequest[] {
  return initializeRequestsStore()
}

