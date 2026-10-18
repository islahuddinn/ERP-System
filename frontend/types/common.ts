// Type definitions for fixing TypeScript errors across the application

// Paginated response structure
export interface PaginationMeta {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
}

export interface PaginatedResponse<T> {
    data: T[]
    meta: PaginationMeta
}

// Global response types that handle both array and paginated formats
export type ApiResponse<T> = T[] | PaginatedResponse<T> | { data: T[]; meta: PaginationMeta }

// Project-specific response types
export type WarehouseResponse = ApiResponse<Warehouse>
export type WarehouseZoneResponse = ApiResponse<WarehouseZone>

export type ProductType = 'FINISHED_GOOD' | 'SEMI_FINISHED' | 'CONSUMABLE' | 'SERVICE'

export interface Product {
    id: string
    name: string
    code: string
    barcode?: string
    description?: string
    type: ProductType
    uomId: string
    uom?: { id: string; name: string; symbol: string }
    currentStock: number
    minStock?: number | null
    maxStock?: number | null
    reorderLevel: number
    sellingPrice?: number        // Float in DB; API returns a number — wrap with Number() before arithmetic
    images: string[]
    isActive: boolean
    deletedAt?: string
    createdById?: string
    updatedById?: string
    createdAt: string
    updatedAt: string
    attributes?: { id: string; name: string; value: string; unit?: string }[]
}

// Raw Materials
export interface RawMaterial {
    id: string
    name: string
    code: string
    description?: string
    uomId: string
    uom?: { id: string; name: string; symbol: string; code: string }
    currentStock: number
    reorderLevel: number
    lastPurchasePrice: string   // Prisma Decimal — parseFloat() before arithmetic
    deletedAt?: string
    createdById?: string
    updatedById?: string
    createdAt: string
    updatedAt: string
}

export type RawMaterialBatchStatus = 'ACTIVE' | 'PARTIAL' | 'CONSUMED' | 'EXPIRED' | 'BLOCKED' | 'QUARANTINE'

export interface RawMaterialBatchConsumption {
    id: string
    batchId: string
    consumedQuantity: number
    remainingAfter: number
    consumedDate: string
    referenceType?: string
    referenceId?: string
    referenceNumber?: string
    reference?: string
    notes?: string
    createdById?: string
    createdAt: string
}

export interface RawMaterialBatch {
    id: string
    batchNumber: string          // auto-generated: RM-YYYYMM-XXXX
    rawMaterialId: string
    grnItemId: string
    siteId: string
    receivedQuantity: number
    consumedQuantity: number
    availableQuantity: number
    unitCost: number
    manufacturingDate?: string
    expiryDate?: string
    receivedDate: string
    status: RawMaterialBatchStatus
    notes?: string
    rawMaterial?: { id: string; name: string; code: string }
    site?: { id: string; name: string; code: string }
    grnItem?: {
        id: string
        receivedQuantity: number
        grn?: {
            id: string
            receivingNumber: string
            receivedDate: string
            supplier?: { name: string }
        }
    }
    consumptions?: RawMaterialBatchConsumption[]
    createdAt: string
    updatedAt: string
}

// Batch interface with all required properties
export interface Batch {
    id: string
    batchNumber: string
    productId: string
    warehouseId: string
    zoneId?: string
    quantity: number
    availableQty: number
    reservedQty?: number
    manufactureDate?: string
    expiryDate?: string
    status?: string
    createdAt?: string
    updatedAt?: string
}

// Plant interface with all properties
export interface Plant {
    id: string
    name: string
    code: string
    status: string
    description?: string
    notes?: string
    plantType?: string
    capacity?: number
    address?: string
    contactPhone?: string
    contactEmail?: string
    contactPerson?: string
    operatingHours?: string
    totalArea?: number
    productionCapacity?: number
    createdAt?: string
    updatedAt?: string
}

// Machine DTO with maintenance fields
export interface CreateMachineDto {
    name: string
    code: string
    plantId: string
    productionLineId?: string
    status: string
    capacity?: number
    manufacturer?: string
    model?: string
    serialNumber?: string
    operatingHours?: number
    location?: string
    description?: string
    notes?: string
    lastMaintenanceDate?: string
    nextMaintenanceDate?: string
    maintenanceInterval?: number
    components?: Array<{
        name: string
        specification: string
    }>
}

// Material Transfer DTO with all fields
export interface CreateMaterialTransferDto {
    transferType: string
    fromWarehouseId?: string
    toWarehouseId?: string
    fromZoneId?: string
    toZoneId?: string
    transferDate?: string
    items: Array<{
        materialId: string
        productId?: string
        quantity: number
        unit?: string
        batchId?: string
        specifications?: string
        notes?: string
    }>
    remarks?: string
    status?: string
}

// Material Transfer Status
export type MaterialTransferStatus = 'PENDING' | 'APPROVED' | 'IN_TRANSIT' | 'COMPLETED' | 'CANCELLED'

// Production Order Status
export type ProductionOrderStatus = 'DRAFT' | 'APPROVED' | 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'all'

// Inspection Status  
export type InspectionStatus = 'PENDING' | 'PASSED' | 'FAILED' | 'all'

// Work Order Status
export type WorkOrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

// Work Order Priority
export type WorkOrderPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

// Work Order interface
export interface WorkOrder {
    id?: string
    productionOrderId: string
    title: string
    description?: string
    status: WorkOrderStatus
    priority: WorkOrderPriority
    scheduledStartDate: string
    scheduledEndDate: string
    assignedToId?: string
    notes?: string
    createdAt?: string
    updatedAt?: string
    startDate?: string
    dueDate?: string
    orderNumber?: string
}

// Waste Record interface
export interface WasteRecord {
    id: string
    recordNumber?: string
    wasteType: string
    productId?: string
    quantity: number
    reason?: string
    notes?: string
    createdAt?: string
    updatedAt?: string
}

// Production Order interface
export interface ProductionOrder {
    id: string
    orderNumber: string
    workOrderId?: string
    workOrder?: {
        id: string
        orderNumber: string
    }
    productId: string
    quantity: number
    plannedQuantity: number
    completedQuantity: number
    status: ProductionOrderStatus
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    plannedStartDate?: string
    plannedEndDate?: string
    actualStartDate?: string
    actualEndDate?: string
    startDate?: string
    endDate?: string
    plantId: string
    productionLineId?: string
    notes?: string
    product: {
        id: string
        name: string
        sku: string
        category: string
    }
    plant: {
        id: string
        name: string
        code: string
    }
    productionLine?: {
        id: string
        name: string
        code: string
    }
    progress: {
        completedQuantity: number
        plannedQuantity: number
        percentage: number
        lastUpdated: string
        qualityChecks: number
        wasteRecords: number
        wasteQuantity: number
    }
    finishedGoodsBatches: any[]
    createdById: string
    createdAt: string
    updatedAt: string
    materialIssues: Array<{
        id: string
        materialId: string
        material: {
            id: string
            name: string
            sku: string
            unit: string
        }
        batchId?: string
        requiredQuantity: number
        issuedQuantity: number
        warehouseId: string
        zoneId?: string
        batch?: {
            id: string
            batchNumber: string
        }
        warehouse?: {
            id: string
            name: string
        }
    }>
}

// Warehouse interface
export interface Warehouse {
    id: string
    name: string
    code: string
    warehouseType: 'STORAGE' | 'DISPATCH'
    locationId: string
    address?: string
    contactPerson?: string
    contactPhone?: string
    contactEmail?: string
    totalCapacity: number
    usedCapacity: number
    availableCapacity: number
    capacityUnit: string
    status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'FULL'
    isActive: boolean
    managerId?: string
    description?: string
    notes?: string
    createdAt: string
    updatedAt: string
    _count?: {
        zones: number
        stockBalances: number
        capacityAlerts: number
    }
}

// Warehouse Zone interface
export interface WarehouseZone {
    id: string
    warehouseId: string
    name: string
    code: string
    zoneType: 'RAW_MATERIALS' | 'PACKAGING' | 'FINISHED_GOODS' | 'QUARANTINE' | 'REJECTED' | 'TEMPORARY'
    description?: string
    totalCapacity: number
    usedCapacity: number
    availableCapacity: number
    isActive: boolean
    temperature?: number
    humidity?: number
    notes?: string
    createdAt: string
    updatedAt: string
}
