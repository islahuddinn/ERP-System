'use client'

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Package, Warehouse, MapPin, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
import { format } from 'date-fns'
import { useWarehouseStockTransactions } from '@/hooks/useWarehouseStock'

interface StockDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  stockBalance?: {
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
}

export function StockDetailsModal({ isOpen, onClose, stockBalance }: StockDetailsModalProps) {
  const { data: transactionsData } = useWarehouseStockTransactions({
    warehouseId: stockBalance?.warehouseId,
    zoneId: stockBalance?.zoneId,
    productId: stockBalance?.productId,
    limit: 10,
  })

  const recentTransactions = transactionsData?.data || []

  if (!stockBalance) return null

  const stockValue = stockBalance.quantity * (stockBalance.product?.price || 0)
  const availableValue = stockBalance.availableQuantity * (stockBalance.product?.price || 0)
  const reservedValue = stockBalance.reservedQuantity * (stockBalance.product?.price || 0)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] bg-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-gray-900 flex items-center gap-2">
            <Package className="h-5 w-5 text-green-600" />
            Stock Details
          </DialogTitle>
          <DialogDescription className="text-gray-600">
            {stockBalance.product?.name || 'Product'} ({stockBalance.product?.sku || 'N/A'})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Information */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="text-sm text-gray-600 mb-1">Product Name</p>
              <p className="font-semibold text-gray-900">{stockBalance.product?.name || 'Unknown'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">SKU</p>
              <p className="font-mono text-sm text-gray-900">{stockBalance.product?.sku || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Category</p>
              <p className="text-gray-900">{stockBalance.product?.category || 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1">Unit Price</p>
              <p className="font-semibold text-gray-900">
                ${(stockBalance.product?.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Location Information */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div>
              <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                <Warehouse className="h-4 w-4" />
                Warehouse
              </p>
              <p className="font-semibold text-gray-900">{stockBalance.warehouse?.name || 'Unknown'}</p>
              <p className="text-xs text-gray-500">{stockBalance.warehouse?.code || ''}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Zone
              </p>
              {stockBalance.zone ? (
                <>
                  <p className="font-semibold text-gray-900">{stockBalance.zone.name}</p>
                  <p className="text-xs text-gray-500">{stockBalance.zone.code}</p>
                </>
              ) : (
                <p className="text-gray-400">No Zone</p>
              )}
            </div>
          </div>

          {/* Batch Information */}
          {stockBalance.batch && (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600 mb-2">Batch Information</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{stockBalance.batch.batchNumber}</Badge>
                <span className="text-sm text-gray-600">
                  Expires: {format(new Date(stockBalance.batch.expiryDate), 'MMM dd, yyyy')}
                </span>
              </div>
            </div>
          )}

          {/* Stock Quantities */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-gray-600 mb-1">Total Quantity</p>
              <p className="text-2xl font-bold text-gray-900">{stockBalance.quantity.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                ${stockValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-gray-600 mb-1">Available</p>
              <p className="text-2xl font-bold text-green-600">{stockBalance.availableQuantity.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                ${availableValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-gray-600 mb-1">Reserved</p>
              <p className="text-2xl font-bold text-orange-600">{stockBalance.reservedQuantity.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-1">
                ${reservedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {/* Last Updated */}
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <p className="text-sm text-gray-600 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Last Updated: {format(new Date(stockBalance.lastUpdated), 'MMM dd, yyyy HH:mm')}
            </p>
          </div>

          {/* Recent Transactions */}
          {recentTransactions.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-900 mb-3">Recent Transactions</p>
              <div className="space-y-2">
                {recentTransactions.map((transaction: any) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center gap-3">
                      {transaction.transactionType === 'IN' || transaction.transactionType === 'TRANSFER_IN' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {transaction.transactionType.replace('_', ' ')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {format(new Date(transaction.createdAt), 'MMM dd, yyyy HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold ${
                        transaction.transactionType === 'IN' || transaction.transactionType === 'TRANSFER_IN'
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}>
                        {transaction.transactionType === 'IN' || transaction.transactionType === 'TRANSFER_IN' ? '+' : '-'}
                        {transaction.quantity.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end pt-4 border-t border-gray-200">
          <Button onClick={onClose} variant="outline" className="border-gray-200">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

