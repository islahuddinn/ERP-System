'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { apiClient } from '@/lib/api-client'
import { Plus, ArrowUpDown, ArrowDown, ArrowUp, RotateCcw, FileText, ChevronDown, ChevronUp, Package } from 'lucide-react'
import TransactionReceipt from '@/components/receipts/TransactionReceipt'

export default function TransactionsPage() {
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null)
  const [isReceiptOpen, setIsReceiptOpen] = useState(false)
  const [expandedBulkOps, setExpandedBulkOps] = useState<Set<string>>(new Set())

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['stock-transactions'],
    queryFn: () => apiClient.get('/stock/transactions').then(res => res.data),
  })

  const { data: locations } = useQuery({
    queryKey: ['locations'],
    queryFn: () => apiClient.get('/locations').then(res => res.data?.data || res.data || []),
  })

  const getLocationName = (locationId: string) => {
    if (!locations || !locationId) return locationId?.slice(0, 8) + '...'
    const location = Array.isArray(locations) 
      ? locations.find((loc: any) => loc.id === locationId)
      : null
    return location?.name || locationId?.slice(0, 8) + '...'
  }

  // Helper to get display type (SALE for POS sales, otherwise original type)
  const getDisplayType = (transaction: any): string => {
    // If transaction has saleId or remarks contain "POS Sale", it's a SALE
    if (transaction.saleId || (transaction.remarks && transaction.remarks.includes('POS Sale'))) {
      return 'SALE'
    }
    return transaction.type
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'RECEIPT':
        return <ArrowDown className="h-4 w-4 text-green-600" />
      case 'ISSUE':
      case 'SALE':
        return <ArrowUp className="h-4 w-4 text-red-600" />
      case 'TRANSFER':
        return <ArrowUpDown className="h-4 w-4 text-blue-600" />
      case 'ADJUSTMENT':
        return <RotateCcw className="h-4 w-4 text-orange-600" />
      default:
        return <ArrowUpDown className="h-4 w-4 text-gray-600" />
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'RECEIPT':
        return 'text-green-600 bg-green-100'
      case 'ISSUE':
      case 'SALE':
        return 'text-red-600 bg-red-100'
      case 'TRANSFER':
        return 'text-blue-600 bg-blue-100'
      case 'ADJUSTMENT':
        return 'text-orange-600 bg-orange-100'
      default:
        return 'text-green-400 bg-green-500/20 border border-green-400/30'
    }
  }

  const handleViewReceipt = (transaction: any) => {
    setSelectedTransaction(transaction)
    setIsReceiptOpen(true)
  }

  const parseBulkOperation = (remarks: string) => {
    try {
      const parsed = JSON.parse(remarks)
      if (parsed.bulkOperation) {
        return parsed
      }
    } catch {
      // Not JSON, return null
    }
    return null
  }

  const toggleBulkDetails = (transactionId: string) => {
    const newExpanded = new Set(expandedBulkOps)
    if (newExpanded.has(transactionId)) {
      newExpanded.delete(transactionId)
    } else {
      newExpanded.add(transactionId)
    }
    setExpandedBulkOps(newExpanded)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Stock Transactions</h1>
            <p className="mt-1 text-lg text-gray-300">
              View and manage all stock movements
            </p>
          </div>

        </div>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            All stock movements in chronological order
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {(transactions?.data || transactions || [])?.map((transaction: any) => {
              const displayType = getDisplayType(transaction)
              const bulkOp = transaction.remarks ? parseBulkOperation(transaction.remarks) : null
              const isExpanded = expandedBulkOps.has(transaction.id)
              
              return (
              <div key={transaction.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${getTransactionColor(displayType)}`}>
                      {getTransactionIcon(displayType)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {bulkOp ? (
                          <>
                            <Package className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">Bulk Operation</span>
                            <span className="text-xs text-gray-400">({bulkOp.totalItems} items)</span>
                          </>
                        ) : (
                          <span className="font-medium">{transaction.product.name}</span>
                        )}
                        <span className={`px-2 py-1 text-xs rounded-full ${getTransactionColor(displayType)}`}>
                          {displayType}
                        </span>
                      </div>
                      <div className="text-sm text-gray-300">
                        {transaction.referenceNo && `Ref: ${transaction.referenceNo}`}
                        {!bulkOp && transaction.remarks && ` • ${transaction.remarks}`}
                        {bulkOp && ` • Bulk Reference: ${bulkOp.bulkReferenceNo}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {bulkOp ? (
                      <div className="font-medium text-blue-400">
                        {bulkOp.totalItems} products
                      </div>
                    ) : (
                      <div className="font-medium">
                        {transaction.quantity} {transaction.product.unit}
                      </div>
                    )}
                    <div className="text-sm text-gray-300">
                      {new Date(transaction.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                
                {bulkOp && (
                  <div className="mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleBulkDetails(transaction.id)}
                      className="flex items-center gap-2 text-gray-400 hover:text-white"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      {isExpanded ? 'Hide' : 'Show'} Details
                    </Button>
                    
                    {isExpanded && (
                      <div className="mt-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                        <div className="space-y-2">
                          {bulkOp.items.map((item: any, idx: number) => (
                            <div key={idx} className="flex items-center justify-between text-sm py-2 border-b border-gray-700 last:border-0">
                              <div className="flex-1">
                                <span className="font-medium text-white">{item.productName}</span>
                                <div className="text-xs text-gray-400 mt-1">
                                  {item.locationId && `Location: ${getLocationName(item.locationId)}`}
                                  {item.fromLocationId && item.toLocationId && (
                                    <span>
                                      {getLocationName(item.fromLocationId)} → {getLocationName(item.toLocationId)}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-green-400">
                                  Qty: {item.quantity}
                                </div>
                                {item.newQuantity !== undefined && (
                                  <div className="text-xs text-gray-400">
                                    New: {item.newQuantity}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {!bulkOp && (transaction.fromLocation || transaction.toLocation) && (
                  <div className="mt-2 text-sm text-gray-600">
                    {transaction.fromLocation && (
                      <span>From: {transaction.fromLocation.name}</span>
                    )}
                    {transaction.fromLocation && transaction.toLocation && (
                      <span className="mx-2">→</span>
                    )}
                    {transaction.toLocation && (
                      <span>To: {transaction.toLocation.name}</span>
                    )}
                  </div>
                )}
                
                <div className="mt-3 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewReceipt(transaction)}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    View Receipt
                  </Button>
                </div>
              </div>
            )
            })}
          </div>

          {(transactions?.data || transactions || [])?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-300">No transactions found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Receipt Dialog */}
      <Dialog open={isReceiptOpen} onOpenChange={setIsReceiptOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction Receipt</DialogTitle>
          </DialogHeader>
          {selectedTransaction && (
            <TransactionReceipt 
              transaction={selectedTransaction} 
              onClose={() => setIsReceiptOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

