// Dummy data for main dashboard
// This file provides realistic dummy data for the inventory management dashboard

import { dummyProducts } from './factory/warehouse-stock'
import { dummyWarehouses } from './factory/warehouses'

// Generate dummy products list (extended from warehouse-stock)
export function getDummyProducts() {
  // Extend the existing dummy products with more variety
  const extendedProducts = [
    ...dummyProducts,
    { id: 'prod-11', name: 'Steel Sheets', sku: 'STL-001', price: 85.00, category: 'Raw Materials' },
    { id: 'prod-12', name: 'Aluminum Rods', sku: 'ALM-002', price: 120.00, category: 'Raw Materials' },
    { id: 'prod-13', name: 'Plastic Pellets', sku: 'PLA-003', price: 45.00, category: 'Raw Materials' },
    { id: 'prod-14', name: 'Copper Wire', sku: 'COP-004', price: 95.00, category: 'Components' },
    { id: 'prod-15', name: 'Rubber Gaskets', sku: 'RUB-005', price: 12.50, category: 'Components' },
    { id: 'prod-16', name: 'Glass Panels', sku: 'GLS-006', price: 180.00, category: 'Components' },
    { id: 'prod-17', name: 'Wood Planks', sku: 'WOD-007', price: 35.00, category: 'Raw Materials' },
    { id: 'prod-18', name: 'Paint Base', sku: 'PNT-008', price: 28.00, category: 'Chemicals' },
    { id: 'prod-19', name: 'Screws M6', sku: 'SCR-009', price: 0.50, category: 'Components' },
    { id: 'prod-20', name: 'Bolts M8', sku: 'BLT-010', price: 0.75, category: 'Components' },
  ]
  
  return extendedProducts.map(p => ({
    ...p,
    status: 'active',
    reorderLevel: Math.floor(Math.random() * 50) + 10,
  }))
}

// Generate dummy stock balances
export function getDummyStockBalances() {
  const products = getDummyProducts()
  const locations = dummyWarehouses
  
  const balances: Array<{
    id: string
    productId: string
    locationId: string
    quantity: number
    reservedQuantity: number
    availableQuantity: number
    product: {
      id: string
      name: string
      sku: string
      price: number
      reorderLevel: number
    }
    location: {
      id: string
      name: string
      code: string
    }
  }> = []
  
  // Create stock balances for each product in various locations
  products.forEach((product, index) => {
    // Each product appears in 2-4 locations
    const locationCount = Math.floor(Math.random() * 3) + 2
    
    for (let i = 0; i < locationCount; i++) {
      const location = locations[Math.floor(Math.random() * locations.length)]
      const quantity = Math.floor(Math.random() * 5000) + 100
      const price = product.price || 0
      
      balances.push({
        id: `balance-${product.id}-${location.id}-${i}`,
        productId: product.id,
        locationId: location.id,
        quantity,
        reservedQuantity: Math.floor(quantity * 0.1),
        availableQuantity: quantity - Math.floor(quantity * 0.1),
        product: {
          id: product.id,
          name: product.name,
          sku: product.sku,
          price,
          reorderLevel: product.reorderLevel || 10,
        },
        location: {
          id: location.id,
          name: location.name,
          code: location.code,
        },
      })
    }
  })
  
  return balances
}

// Generate dummy purchases
export function getDummyPurchases() {
  const purchases = []
  const suppliers = [
    { id: 'supplier-1', name: 'ABC Supplies Inc.' },
    { id: 'supplier-2', name: 'XYZ Materials Ltd.' },
    { id: 'supplier-3', name: 'Global Components Co.' },
    { id: 'supplier-4', name: 'Prime Raw Materials' },
    { id: 'supplier-5', name: 'Quality Goods Corp.' },
  ]
  
  const statuses = ['PENDING', 'DRAFT', 'COMPLETED', 'COMPLETED', 'COMPLETED', 'PENDING', 'COMPLETED']
  
  for (let i = 1; i <= 25; i++) {
    const supplier = suppliers[Math.floor(Math.random() * suppliers.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    const totalAmount = Math.floor(Math.random() * 50000) + 1000
    const createdAt = new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000)
    
    purchases.push({
      id: `purchase-${i}`,
      invoiceNumber: `INV-2024-${String(i).padStart(4, '0')}`,
      orderNumber: `PO-2024-${String(i).padStart(4, '0')}`,
      supplierId: supplier.id,
      supplier: {
        id: supplier.id,
        name: supplier.name,
      },
      status,
      totalAmount,
      createdAt: createdAt.toISOString(),
      updatedAt: createdAt.toISOString(),
    })
  }
  
  return purchases
}

// Generate dummy suppliers
export function getDummySuppliers() {
  return [
    { id: 'supplier-1', name: 'ABC Supplies Inc.', email: 'contact@abcsupplies.com', phone: '+1-555-0101' },
    { id: 'supplier-2', name: 'XYZ Materials Ltd.', email: 'info@xyzmaterials.com', phone: '+1-555-0102' },
    { id: 'supplier-3', name: 'Global Components Co.', email: 'sales@globalcomponents.com', phone: '+1-555-0103' },
    { id: 'supplier-4', name: 'Prime Raw Materials', email: 'contact@primeraw.com', phone: '+1-555-0104' },
    { id: 'supplier-5', name: 'Quality Goods Corp.', email: 'info@qualitygoods.com', phone: '+1-555-0105' },
    { id: 'supplier-6', name: 'Industrial Parts Inc.', email: 'sales@industrialparts.com', phone: '+1-555-0106' },
    { id: 'supplier-7', name: 'Metro Supplies', email: 'contact@metrosupplies.com', phone: '+1-555-0107' },
    { id: 'supplier-8', name: 'Tech Components Ltd.', email: 'info@techcomponents.com', phone: '+1-555-0108' },
  ]
}

