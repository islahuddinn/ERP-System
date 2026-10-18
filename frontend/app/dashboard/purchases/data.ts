export type PurchaseOrderStatus = 'DRAFT' | 'SENT' | 'PARTIAL' | 'COMPLETED' | 'CANCELLED'

export interface PurchaseOrder {
    id: string
    orderNumber: string
    date: string
    supplier: string
    branch: string
    items: number
    totalAmount: number
    status: PurchaseOrderStatus
    maker: string
}

export const dummyPurchaseOrders: PurchaseOrder[] = [
    {
        id: '1',
        orderNumber: 'PO-2026-001',
        date: '2026-01-05',
        supplier: 'Tech Supplies Co.',
        branch: 'Main Branch',
        items: 5,
        totalAmount: 12500.00,
        status: 'DRAFT',
        maker: 'Admin'
    },
    {
        id: '2',
        orderNumber: 'PO-2026-002',
        date: '2026-01-04',
        supplier: 'Raw Materials Inc.',
        branch: 'Warehouse A',
        items: 12,
        totalAmount: 45200.50,
        status: 'SENT',
        maker: 'John Doe'
    },
    {
        id: '3',
        orderNumber: 'PO-2025-089',
        date: '2025-12-28',
        supplier: 'Global Trade Ltd.',
        branch: 'Downtown Layout',
        items: 3,
        totalAmount: 3400.00,
        status: 'PARTIAL',
        maker: 'Jane Smith'
    },
    {
        id: '4',
        orderNumber: 'PO-2025-088',
        date: '2025-12-25',
        supplier: 'Tech Supplies Co.',
        branch: 'Main Branch',
        items: 25,
        totalAmount: 156000.00,
        status: 'COMPLETED',
        maker: 'Admin'
    },
    {
        id: '5',
        orderNumber: 'PO-2025-085',
        date: '2025-12-20',
        supplier: 'BuildRight Supplies',
        branch: 'Warehouse A',
        items: 8,
        totalAmount: 8900.00,
        status: 'CANCELLED',
        maker: 'Mike Johnson'
    },
    {
        id: '6',
        orderNumber: 'PO-2026-003',
        date: '2026-01-05',
        supplier: 'Office Depot',
        branch: 'Main Branch',
        items: 2,
        totalAmount: 450.00,
        status: 'DRAFT',
        maker: 'Admin'
    },
    {
        id: '7',
        orderNumber: 'PO-2025-092',
        date: '2025-12-30',
        supplier: 'Raw Materials Inc.',
        branch: 'Main Branch',
        items: 15,
        totalAmount: 67000.00,
        status: 'SENT',
        maker: 'Admin'
    }
]
