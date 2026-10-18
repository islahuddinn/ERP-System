// Dummy data generator for Material Receiving
// This file provides realistic dummy data for testing and development

export type ReceivingStatus = 'PENDING' | 'RECEIVED' | 'INSPECTING' | 'QUALITY_CHECK' | 'APPROVED' | 'ACCEPTED' | 'REJECTED'
export type QualityStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'CONDITIONAL'

export interface ReceivingItem {
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
  batchNumber?: string
  manufacturingDate?: string
  expiryDate?: string
  qualityStatus?: QualityStatus
  qualityNotes?: string
  acceptedQuantity?: number
  rejectedQuantity?: number
  notes?: string
}

export interface ReceivingBatch {
  id: string
  batchNumber: string
  productId: string
  product: {
    id: string
    name: string
    code: string
  }
  quantity: number
  manufacturingDate?: string
  expiryDate?: string
  warehouseId: string
  zoneId?: string
  createdAt: string
}

export interface MaterialReceiving {
  id: string
  receivingNumber: string
  supplierId?: string
  supplier?: {
    id: string
    name: string
    code: string
    contactPerson?: string
    contactEmail?: string
    contactPhone?: string
  }
  purchaseOrderId?: string
  purchaseOrder?: {
    id: string
    orderNumber: string
    orderDate: string
  }
  receivedDate: string
  warehouseId: string
  warehouse: {
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
  status: ReceivingStatus
  items: ReceivingItem[]
  itemsCount: number
  totalQuantity: number
  batches?: ReceivingBatch[]
  notes?: string
  receivedBy: {
    id: string
    name: string
    email: string
  }
  qualityCheckedBy?: {
    id: string
    name: string
    email: string
  }
  qualityCheckedAt?: string
  acceptedBy?: {
    id: string
    name: string
    email: string
  }
  acceptedAt?: string
  rejectedBy?: {
    id: string
    name: string
    email: string
  }
  rejectedAt?: string
  rejectionReason?: string
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
  { id: 'prod-11', name: 'Nuts M8', code: 'NUT-011', unit: 'UNIT' },
  { id: 'prod-12', name: 'Washers', code: 'WSH-012', unit: 'UNIT' },
  { id: 'prod-13', name: 'Adhesive', code: 'ADH-013', unit: 'L' },
  { id: 'prod-14', name: 'Sealant', code: 'SEL-014', unit: 'L' },
  { id: 'prod-15', name: 'Insulation Foam', code: 'INS-015', unit: 'M2' },
]

// Dummy suppliers
const dummySuppliers = [
  { id: 'sup-1', name: 'ABC Materials Inc.', code: 'SUP-001', contactPerson: 'John Doe', contactEmail: 'john@abc.com', contactPhone: '+1-555-0101' },
  { id: 'sup-2', name: 'XYZ Supplies Ltd.', code: 'SUP-002', contactPerson: 'Jane Smith', contactEmail: 'jane@xyz.com', contactPhone: '+1-555-0102' },
  { id: 'sup-3', name: 'Global Components Co.', code: 'SUP-003', contactPerson: 'Bob Johnson', contactEmail: 'bob@global.com', contactPhone: '+1-555-0103' },
  { id: 'sup-4', name: 'Premium Materials', code: 'SUP-004', contactPerson: 'Alice Brown', contactEmail: 'alice@premium.com', contactPhone: '+1-555-0104' },
  { id: 'sup-5', name: 'Industrial Supply', code: 'SUP-005', contactPerson: 'Charlie Wilson', contactEmail: 'charlie@industrial.com', contactPhone: '+1-555-0105' },
]

// Dummy warehouses
const dummyWarehouses = [
  { id: 'wh-1', name: 'Main Storage Warehouse', code: 'WH-001' },
  { id: 'wh-2', name: 'North Warehouse', code: 'WH-002' },
  { id: 'wh-3', name: 'South Distribution', code: 'WH-003' },
  { id: 'wh-4', name: 'East Storage', code: 'WH-004' },
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

const statuses: ReceivingStatus[] = ['PENDING', 'RECEIVED', 'INSPECTING', 'QUALITY_CHECK', 'APPROVED', 'ACCEPTED', 'REJECTED']
const qualityStatuses: QualityStatus[] = ['PENDING', 'PASSED', 'FAILED', 'CONDITIONAL']

export function generateDummyMaterialReceivings(count: number = 30): MaterialReceiving[] {
  const receivings: MaterialReceiving[] = []

  for (let i = 1; i <= count; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const supplier = dummySuppliers[Math.floor(Math.random() * dummySuppliers.length)]
    const warehouse = dummyWarehouses[Math.floor(Math.random() * dummyWarehouses.length)]
    const zone = Math.random() > 0.4 ? dummyZones[Math.floor(Math.random() * dummyZones.length)] : undefined

    // Generate items (5-20 items per receiving)
    const itemsCount = Math.floor(Math.random() * 16) + 5
    const items: ReceivingItem[] = []
    let totalQuantity = 0
    const batches: ReceivingBatch[] = []

    for (let j = 0; j < itemsCount; j++) {
      const product = dummyProducts[Math.floor(Math.random() * dummyProducts.length)]
      const quantity = Math.floor(Math.random() * 1000) + 10
      totalQuantity += quantity

      const manufacturingDate = new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000)
      const expiryDate = new Date(Date.now() + Math.random() * 730 * 24 * 60 * 60 * 1000)
      const batchNumber = `BATCH-${Math.random().toString(36).substring(2, 10).toUpperCase()}`
      const qualityStatus = status === 'QUALITY_CHECK' || status === 'APPROVED' || status === 'REJECTED'
        ? qualityStatuses[Math.floor(Math.random() * qualityStatuses.length)]
        : undefined

      const acceptedQuantity = qualityStatus === 'PASSED' || qualityStatus === 'CONDITIONAL'
        ? quantity - Math.floor(Math.random() * 5)
        : qualityStatus === 'FAILED'
          ? 0
          : undefined

      const rejectedQuantity = qualityStatus === 'FAILED'
        ? quantity
        : qualityStatus === 'CONDITIONAL'
          ? quantity - (acceptedQuantity || 0)
          : undefined

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
        batchNumber,
        manufacturingDate: manufacturingDate.toISOString(),
        expiryDate: expiryDate.toISOString(),
        qualityStatus,
        qualityNotes: qualityStatus && qualityStatus !== 'PENDING' ? 'Quality inspection notes' : undefined,
        acceptedQuantity,
        rejectedQuantity,
        notes: Math.random() > 0.7 ? 'Item-specific notes' : undefined,
      })

      // Generate batch if accepted
      if (status === 'APPROVED' && (qualityStatus === 'PASSED' || qualityStatus === 'CONDITIONAL')) {
        batches.push({
          id: `batch-${i}-${j}`,
          batchNumber,
          productId: product.id,
          product: {
            id: product.id,
            name: product.name,
            code: product.code,
          },
          quantity: acceptedQuantity || quantity,
          manufacturingDate: manufacturingDate.toISOString(),
          expiryDate: expiryDate.toISOString(),
          warehouseId: warehouse.id,
          zoneId: zone?.id,
          createdAt: new Date().toISOString(),
        })
      }
    }

    const receivedDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    const receivedBy = dummyUsers[Math.floor(Math.random() * dummyUsers.length)]
    const qualityCheckedBy = status === 'QUALITY_CHECK' || status === 'APPROVED' || status === 'REJECTED'
      ? dummyUsers[Math.floor(Math.random() * dummyUsers.length)]
      : undefined
    const qualityCheckedAt = qualityCheckedBy
      ? new Date(receivedDate.getTime() + 1000 * 60 * 60 * 24).toISOString()
      : undefined
    const acceptedBy = status === 'APPROVED'
      ? dummyUsers[Math.floor(Math.random() * dummyUsers.length)]
      : undefined
    const acceptedAt = acceptedBy
      ? new Date(receivedDate.getTime() + 1000 * 60 * 60 * 48).toISOString()
      : undefined
    const rejectedBy = status === 'REJECTED'
      ? dummyUsers[Math.floor(Math.random() * dummyUsers.length)]
      : undefined
    const rejectedAt = rejectedBy
      ? new Date(receivedDate.getTime() + 1000 * 60 * 60 * 48).toISOString()
      : undefined

    const receiving: MaterialReceiving = {
      id: `rec-${i.toString().padStart(4, '0')}`,
      receivingNumber: `REC-${new Date().getFullYear()}-${i.toString().padStart(5, '0')}`,
      supplierId: supplier.id,
      supplier,
      purchaseOrderId: Math.random() > 0.5 ? `po-${i}` : undefined,
      purchaseOrder: Math.random() > 0.5 ? {
        id: `po-${i}`,
        orderNumber: `PO-${new Date().getFullYear()}-${i.toString().padStart(5, '0')}`,
        orderDate: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString(),
      } : undefined,
      receivedDate: receivedDate.toISOString(),
      warehouseId: warehouse.id,
      warehouse,
      zoneId: zone?.id,
      zone,
      status,
      items,
      itemsCount: items.length,
      totalQuantity,
      batches: status === 'APPROVED' ? batches : undefined,
      notes: Math.random() > 0.5 ? 'Receiving notes and special instructions' : undefined,
      receivedBy,
      qualityCheckedBy,
      qualityCheckedAt,
      acceptedBy,
      acceptedAt,
      rejectedBy,
      rejectedAt,
      rejectionReason: status === 'REJECTED' ? 'Quality issues or damaged goods' : undefined,
      createdAt: receivedDate.toISOString(),
      updatedAt: new Date().toISOString(),
    }

    receivings.push(receiving)
  }

  return receivings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// In-memory storage for dummy material receiving (lazy initialization)
let dummyReceivingsStore: MaterialReceiving[] | null = null

// Initialize receivings store if not already initialized
function initializeReceivingsStore() {
  if (!dummyReceivingsStore) {
    try {
      dummyReceivingsStore = generateDummyMaterialReceivings(30)
    } catch (error) {
      console.error('Error initializing material receiving store:', error)
      dummyReceivingsStore = []
    }
  }
  return dummyReceivingsStore
}

export function getMaterialReceivingById(id: string): MaterialReceiving | undefined {
  const store = initializeReceivingsStore()
  return store.find(r => r.id === id)
}

// Get all receivings with filters (using store)
export function getDummyMaterialReceivings(filters?: {
  search?: string
  status?: ReceivingStatus
  supplierId?: string
  warehouseId?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}): { data: MaterialReceiving[]; meta: { total: number; page: number; limit: number; totalPages: number } } {
  const store = initializeReceivingsStore()
  let receivings = [...store]

  // Apply filters
  if (filters?.search) {
    const searchLower = filters.search.toLowerCase()
    receivings = receivings.filter(r =>
      r.receivingNumber.toLowerCase().includes(searchLower) ||
      r.supplier?.name.toLowerCase().includes(searchLower) ||
      r.warehouse.name.toLowerCase().includes(searchLower) ||
      r.items.some(item => item.product.name.toLowerCase().includes(searchLower))
    )
  }

  if (filters?.status) {
    receivings = receivings.filter(r => r.status === filters.status)
  }

  if (filters?.supplierId) {
    receivings = receivings.filter(r => r.supplierId === filters.supplierId)
  }

  if (filters?.warehouseId) {
    receivings = receivings.filter(r => r.warehouseId === filters.warehouseId)
  }

  if (filters?.dateFrom) {
    receivings = receivings.filter(r => new Date(r.receivedDate) >= new Date(filters.dateFrom!))
  }

  if (filters?.dateTo) {
    receivings = receivings.filter(r => new Date(r.receivedDate) <= new Date(filters.dateTo!))
  }

  // Pagination
  const page = filters?.page || 1
  const limit = filters?.limit || 20
  const total = receivings.length
  const totalPages = Math.ceil(total / limit)
  const startIndex = (page - 1) * limit
  const endIndex = startIndex + limit
  const paginatedReceivings = receivings.slice(startIndex, endIndex)

  return {
    data: paginatedReceivings,
    meta: {
      total,
      page,
      limit,
      totalPages,
    },
  }
}

// Create material receiving
export function createDummyMaterialReceiving(data: Omit<MaterialReceiving, 'id' | 'receivingNumber' | 'createdAt' | 'updatedAt'>): MaterialReceiving {
  const store = initializeReceivingsStore()
  const receivingNumber = `REC-${new Date().getFullYear()}-${String(store.length + 1).padStart(5, '0')}`
  const newReceiving: MaterialReceiving = {
    ...data,
    id: `rec-${Date.now()}`,
    receivingNumber,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  store.push(newReceiving)
  return newReceiving
}

// Update material receiving status
export function updateDummyMaterialReceivingStatus(
  id: string,
  status: ReceivingStatus
): MaterialReceiving | null {
  const store = initializeReceivingsStore()
  const index = store.findIndex(r => r.id === id)
  if (index === -1) return null

  const updated: MaterialReceiving = {
    ...store[index],
    status,
    updatedAt: new Date().toISOString(),
  }

  store[index] = updated
  return updated
}

// Export store for mutations
export function getDummyMaterialReceivingsStore(): MaterialReceiving[] {
  return initializeReceivingsStore()
}

