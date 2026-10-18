// Dummy data generator for warehouse stock
// This file provides realistic dummy data for warehouse stock balances, transactions, and alerts

import type { Warehouse, WarehouseZone } from '@/hooks/useWarehouses'
import { dummyWarehouses, dummyZonesByWarehouse } from './warehouses'

// Dummy products for stock
export const dummyProducts = [
  { id: 'prod-1', name: 'Raw Material A', sku: 'RM-A-001', price: 25.50, category: 'Raw Materials' },
  { id: 'prod-2', name: 'Raw Material B', sku: 'RM-B-002', price: 18.75, category: 'Raw Materials' },
  { id: 'prod-3', name: 'Packaging Box Small', sku: 'PKG-S-001', price: 2.50, category: 'Packaging' },
  { id: 'prod-4', name: 'Packaging Box Large', sku: 'PKG-L-002', price: 5.00, category: 'Packaging' },
  { id: 'prod-5', name: 'Finished Product X', sku: 'FP-X-001', price: 150.00, category: 'Finished Goods' },
  { id: 'prod-6', name: 'Finished Product Y', sku: 'FP-Y-002', price: 200.00, category: 'Finished Goods' },
  { id: 'prod-7', name: 'Component C', sku: 'COMP-C-001', price: 45.00, category: 'Components' },
  { id: 'prod-8', name: 'Component D', sku: 'COMP-D-002', price: 60.00, category: 'Components' },
  { id: 'prod-9', name: 'Chemical E', sku: 'CHEM-E-001', price: 35.00, category: 'Chemicals' },
  { id: 'prod-10', name: 'Chemical F', sku: 'CHEM-F-002', price: 42.50, category: 'Chemicals' },
]

// Dummy batches
export const dummyBatches = [
  { id: 'batch-1', batchNumber: 'BATCH-2024-001', productId: 'prod-1', manufacturingDate: new Date('2024-01-15'), expiryDate: new Date('2025-01-15') },
  { id: 'batch-2', batchNumber: 'BATCH-2024-002', productId: 'prod-1', manufacturingDate: new Date('2024-02-10'), expiryDate: new Date('2025-02-10') },
  { id: 'batch-3', batchNumber: 'BATCH-2024-003', productId: 'prod-2', manufacturingDate: new Date('2024-01-20'), expiryDate: new Date('2025-01-20') },
  { id: 'batch-4', batchNumber: 'BATCH-2024-004', productId: 'prod-3', manufacturingDate: new Date('2024-03-01'), expiryDate: new Date('2026-03-01') },
  { id: 'batch-5', batchNumber: 'BATCH-2024-005', productId: 'prod-5', manufacturingDate: new Date('2024-02-15'), expiryDate: new Date('2025-02-15') },
]

export interface WarehouseStockBalance {
  id: string
  warehouseId: string
  zoneId?: string
  productId: string
  batchId?: string
  quantity: number
  reservedQuantity: number
  availableQuantity: number
  lastUpdated: string
  warehouse?: {
    id: string
    name: string
    code: string
  }
  zone?: {
    id: string
    name: string
    code: string
  }
  product?: {
    id: string
    name: string
    sku: string
    price: number
    category: string
  }
  batch?: {
    id: string
    batchNumber: string
    expiryDate: string
  }
}

export interface WarehouseStockTransaction {
  id: string
  warehouseId: string
  zoneId?: string
  productId: string
  batchId?: string
  transactionType: 'IN' | 'OUT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT'
  quantity: number
  referenceType?: string
  referenceId?: string
  notes?: string
  createdAt: string
  createdById?: string
  warehouse?: {
    id: string
    name: string
    code: string
  }
  zone?: {
    id: string
    name: string
    code: string
  }
  product?: {
    id: string
    name: string
    sku: string
  }
  batch?: {
    id: string
    batchNumber: string
  }
}

// Generate dummy warehouse stock balances
export function generateDummyWarehouseStockBalances(): WarehouseStockBalance[] {
  const balances: WarehouseStockBalance[] = []
  
  dummyWarehouses.forEach(warehouse => {
    const zones = dummyZonesByWarehouse.get(warehouse.id) || []
    
    // Generate stock for each product in various zones
    dummyProducts.forEach((product, productIndex) => {
      // Some products in some zones
      if (Math.random() > 0.3) {
        const zone = zones.length > 0 && Math.random() > 0.4 
          ? zones[Math.floor(Math.random() * zones.length)]
          : undefined
        
        const batch = productIndex % 2 === 0 && Math.random() > 0.5
          ? dummyBatches[Math.floor(Math.random() * dummyBatches.length)]
          : undefined
        
        const quantity = Math.floor(Math.random() * 1000) + 100
        const reservedQuantity = Math.floor(quantity * (Math.random() * 0.2)) // 0-20% reserved
        const availableQuantity = quantity - reservedQuantity
        
        balances.push({
          id: `wsb-${warehouse.id}-${product.id}-${zone?.id || 'nozone'}-${batch?.id || 'nobatch'}`,
          warehouseId: warehouse.id,
          zoneId: zone?.id,
          productId: product.id,
          batchId: batch?.id,
          quantity,
          reservedQuantity,
          availableQuantity,
          lastUpdated: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          warehouse: {
            id: warehouse.id,
            name: warehouse.name,
            code: warehouse.code,
          },
          zone: zone ? {
            id: zone.id,
            name: zone.name,
            code: zone.code,
          } : undefined,
          product: {
            id: product.id,
            name: product.name,
            sku: product.sku,
            price: product.price,
            category: product.category,
          },
          batch: batch ? {
            id: batch.id,
            batchNumber: batch.batchNumber,
            expiryDate: batch.expiryDate.toISOString(),
          } : undefined,
        })
      }
    })
  })
  
  return balances
}

// Generate dummy warehouse stock transactions
export function generateDummyWarehouseStockTransactions(): WarehouseStockTransaction[] {
  const transactions: WarehouseStockTransaction[] = []
  const transactionTypes: ('IN' | 'OUT' | 'TRANSFER_IN' | 'TRANSFER_OUT' | 'ADJUSTMENT')[] = 
    ['IN', 'OUT', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT']
  
  // Generate transactions for the last 30 days
  for (let i = 0; i < 200; i++) {
    const warehouse = dummyWarehouses[Math.floor(Math.random() * dummyWarehouses.length)]
    const zones = dummyZonesByWarehouse.get(warehouse.id) || []
    const zone = zones.length > 0 && Math.random() > 0.3 
      ? zones[Math.floor(Math.random() * zones.length)]
      : undefined
    const product = dummyProducts[Math.floor(Math.random() * dummyProducts.length)]
    const batch = Math.random() > 0.5 
      ? dummyBatches[Math.floor(Math.random() * dummyBatches.length)]
      : undefined
    const transactionType = transactionTypes[Math.floor(Math.random() * transactionTypes.length)]
    const quantity = Math.floor(Math.random() * 500) + 10
    const createdAt = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000)
    
    transactions.push({
      id: `wst-${i}`,
      warehouseId: warehouse.id,
      zoneId: zone?.id,
      productId: product.id,
      batchId: batch?.id,
      transactionType,
      quantity,
      referenceType: transactionType === 'IN' ? 'RECEIVING' :
                     transactionType === 'OUT' ? 'MATERIAL_REQUEST' :
                     transactionType === 'TRANSFER_IN' || transactionType === 'TRANSFER_OUT' ? 'TRANSFER' :
                     'ADJUSTMENT',
      referenceId: `ref-${i}`,
      notes: transactionType === 'ADJUSTMENT' ? 'Stock adjustment' : undefined,
      createdAt: createdAt.toISOString(),
      createdById: 'user-1',
      warehouse: {
        id: warehouse.id,
        name: warehouse.name,
        code: warehouse.code,
      },
      zone: zone ? {
        id: zone.id,
        name: zone.name,
        code: zone.code,
      } : undefined,
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
      },
      batch: batch ? {
        id: batch.id,
        batchNumber: batch.batchNumber,
      } : undefined,
    })
  }
  
  // Sort by date (newest first)
  return transactions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// Pre-generate all stock data
export const dummyWarehouseStockBalances = generateDummyWarehouseStockBalances()
export const dummyWarehouseStockTransactions = generateDummyWarehouseStockTransactions()

// Helper functions
export function getStockByWarehouse(warehouseId?: string): WarehouseStockBalance[] {
  if (warehouseId) {
    return dummyWarehouseStockBalances.filter(b => b.warehouseId === warehouseId)
  }
  return dummyWarehouseStockBalances
}

export function getStockByZone(zoneId?: string): WarehouseStockBalance[] {
  if (zoneId) {
    return dummyWarehouseStockBalances.filter(b => b.zoneId === zoneId)
  }
  return dummyWarehouseStockBalances
}

export function getStockByProduct(productId?: string): WarehouseStockBalance[] {
  if (productId) {
    return dummyWarehouseStockBalances.filter(b => b.productId === productId)
  }
  return dummyWarehouseStockBalances
}

export function getTransactionsByWarehouse(warehouseId?: string): WarehouseStockTransaction[] {
  if (warehouseId) {
    return dummyWarehouseStockTransactions.filter(t => t.warehouseId === warehouseId)
  }
  return dummyWarehouseStockTransactions
}

export function getTransactionsByZone(zoneId?: string): WarehouseStockTransaction[] {
  if (zoneId) {
    return dummyWarehouseStockTransactions.filter(t => t.zoneId === zoneId)
  }
  return dummyWarehouseStockTransactions
}

