'use client'

import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { 
  ArrowLeft,
  Download,
  FileText,
  Printer,
  Package,
  Calendar,
  User,
  Mail,
  Phone,
  MapPin
} from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { format } from 'date-fns'
import { formatCurrency } from '@/lib/currency'

interface PurchaseOrder {
  id: string
  orderNumber: string
  supplier: {
    id: string
    name: string
    contactPerson?: string
    email?: string
    phone?: string
    address?: string
  }
  orderDate: string
  expectedDate?: string
  status: 'PENDING' | 'RECEIVED' | 'PARTIAL' | 'CANCELLED'
  paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID'
  totalAmount: number
  amountPaid: number
  remarks?: string
  items: Array<{
    id: string
    product: {
      id: string
      name: string
      sku: string
      uom: {
        symbol: string
      }
    }
    quantity: number
    costPrice: number
    retailPrice: number
    totalPrice: number
    expiryDate?: string
  }>
  createdById: string
  createdAt: string
  updatedAt: string
}

export default function PurchaseInvoicePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const purchaseId = params.id as string
  const shouldAutoPrint = searchParams.get('print') === 'true'

  // Fetch purchase order details
  const { data: purchase, isLoading, error } = useQuery({
    queryKey: ['purchase', purchaseId],
    queryFn: async (): Promise<PurchaseOrder> => {
      const response = await apiClient.get(`/purchases/${purchaseId}`)
      return response.data
    },
    retry: 1,
    staleTime: 5 * 60 * 1000,
  })

  // Fetch invoice settings for company information
  const { data: invoiceSettings } = useQuery({
    queryKey: ['invoice-settings'],
    queryFn: async () => {
      const response = await apiClient.get('/invoice-settings')
      return response.data
    },
    retry: 1,
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
  })

  // Auto-print when print parameter is present and data is loaded
  useEffect(() => {
    if (shouldAutoPrint && purchase && !isLoading) {
      // Small delay to ensure page is fully rendered
      const timer = setTimeout(() => {
        window.print()
        // Remove print parameter from URL after printing
        const url = new URL(window.location.href)
        url.searchParams.delete('print')
        window.history.replaceState({}, '', url.toString())
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [shouldAutoPrint, purchase, isLoading])

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = async () => {
    try {
      const response = await apiClient.get(`/purchases/${purchaseId}/pdf`, {
        responseType: 'blob'
      })
      
      const blob = new Blob([response.data])
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `purchase-invoice-${purchase?.orderNumber}.pdf`
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('PDF download failed:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || !purchase) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Error loading purchase invoice: {error?.message || 'Purchase not found'}</p>
        <Button onClick={() => router.back()} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Back
        </Button>
      </div>
    )
  }

  const subtotal = purchase.items.reduce((sum, item) => sum + item.totalPrice, 0)
  const tax = 0 // Assuming no tax for now
  const discount = 0 // Assuming no discount for now
  const total = subtotal + tax - discount

  return (
    <>
      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          @page {
            margin: 1cm;
            size: A4;
          }
          
          body {
            background: white !important;
            color: black !important;
          }
          
          .print\\:hidden {
            display: none !important;
          }
          
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          
          .print\\:p-0 {
            padding: 0 !important;
          }
          
          .print\\:text-2xl {
            font-size: 1.5rem !important;
          }
          
          .print\\:text-base {
            font-size: 0.875rem !important;
          }
          
          .print\\:text-sm {
            font-size: 0.75rem !important;
          }
          
          .print\\:text-xs {
            font-size: 0.625rem !important;
          }
          
          .print\\:mb-6 {
            margin-bottom: 1.5rem !important;
          }
          
          .print\\:mb-3 {
            margin-bottom: 0.75rem !important;
          }
          
          .print\\:mb-1 {
            margin-bottom: 0.25rem !important;
          }
          
          .print\\:pb-4 {
            padding-bottom: 1rem !important;
          }
          
          .print\\:gap-6 {
            gap: 1.5rem !important;
          }
          
          .print\\:mt-8 {
            margin-top: 2rem !important;
          }
          
          .print\\:pt-4 {
            padding-top: 1rem !important;
          }
          
          .print\\:bg-transparent {
            background: transparent !important;
          }
          
          .print\\:border {
            border: 1px solid #d1d5db !important;
          }
          
          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }
          
          .print\\:border-gray-600 {
            border-color: #4b5563 !important;
          }
          
          .print\\:rounded {
            border-radius: 0.25rem !important;
          }
          
          .print\\:block {
            display: block !important;
          }
          
          .print\\:ml-0 {
            margin-left: 0 !important;
          }
          
          .print\\:table-fixed {
            table-layout: fixed !important;
          }
          
          .print\\:table-cell {
            display: table-cell !important;
          }
          
          .print\\:overflow-visible {
            overflow: visible !important;
          }
          
          .print\\:bg-gray-200 {
            background-color: #e5e7eb !important;
          }
        }
      `}</style>
      
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-white">Purchase Invoice</h1>
            <p className="text-gray-400">Order #{purchase.orderNumber}</p>
          </div>
        </div>
        <div className="flex gap-2 print:hidden">
          <Button
            onClick={handlePrint}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button
            onClick={handleDownloadPDF}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Invoice */}
      <div className="bg-white text-black p-8 rounded-lg shadow-lg print:shadow-none print:p-0">
        {/* Company Header */}
        <div className="text-center mb-8 border-b-2 border-gray-300 pb-6 print:mb-6 print:pb-4">
          <h1 className="text-3xl font-bold text-gray-900 print:text-2xl">
            {invoiceSettings?.receiptTitle || 'PURCHASE ORDER INVOICE'}
          </h1>
          <p className="text-gray-600 mt-2 print:text-sm">Order #{purchase.orderNumber}</p>
        </div>

        {/* Invoice Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 print:mb-6 print:gap-6">
          {/* Company Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 print:text-base print:mb-3">From:</h3>
            <div className="space-y-1 text-gray-700 print:text-sm">
              <p className="font-semibold text-base print:text-sm">Malind Tech</p>
              <p className="text-gray-600">Inventory Management System</p>
            </div>
          </div>

          {/* Invoice Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4 print:text-base print:mb-3">Order Details:</h3>
            <div className="space-y-2 text-gray-700 print:text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Order Date:</span>
                <span className="font-medium">{format(new Date(purchase.orderDate), 'MMM dd, yyyy')}</span>
              </div>
              {purchase.expectedDate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Expected Date:</span>
                  <span className="font-medium">{format(new Date(purchase.expectedDate), 'MMM dd, yyyy')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-semibold ${
                  purchase.status === 'RECEIVED' ? 'text-green-600' :
                  purchase.status === 'PENDING' ? 'text-yellow-600' :
                  purchase.status === 'CANCELLED' ? 'text-red-600' : 'text-blue-600'
                }`}>
                  {purchase.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Payment Status:</span>
                <span className={`font-semibold ${
                  purchase.paymentStatus === 'PAID' ? 'text-green-600' :
                  purchase.paymentStatus === 'PARTIAL' ? 'text-orange-600' : 'text-yellow-600'
                }`}>
                  {purchase.paymentStatus}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Supplier Info */}
        <div className="mb-8 print:mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 print:text-base print:mb-3">Bill To:</h3>
          <div className="bg-gray-50 p-4 rounded-lg print:bg-transparent print:p-0 print:border print:border-gray-300 print:rounded">
            <div className="space-y-2 text-gray-700 print:text-sm">
              <p className="font-semibold text-lg print:text-base">{purchase.supplier.name}</p>
              {purchase.supplier.contactPerson && (
                <p className="flex items-center print:block">
                  <User className="h-4 w-4 mr-2 print:hidden" />
                  <span className="print:ml-0">{purchase.supplier.contactPerson}</span>
                </p>
              )}
              {purchase.supplier.email && (
                <p className="flex items-center print:block">
                  <Mail className="h-4 w-4 mr-2 print:hidden" />
                  <span className="print:ml-0">{purchase.supplier.email}</span>
                </p>
              )}
              {purchase.supplier.phone && (
                <p className="flex items-center print:block">
                  <Phone className="h-4 w-4 mr-2 print:hidden" />
                  <span className="print:ml-0">{purchase.supplier.phone}</span>
                </p>
              )}
              {purchase.supplier.address && (
                <p className="flex items-center print:block">
                  <MapPin className="h-4 w-4 mr-2 print:hidden" />
                  <span className="print:ml-0">{purchase.supplier.address}</span>
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-8 print:mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 print:text-base print:mb-3">Order Items:</h3>
          <div className="overflow-x-auto print:overflow-visible">
            <Table className="print:table-fixed">
              <TableHeader>
                <TableRow className="bg-gray-100 print:bg-gray-200">
                  <TableHead className="text-gray-800 font-semibold print:text-xs w-12">#</TableHead>
                  <TableHead className="text-gray-800 font-semibold print:text-xs">Product</TableHead>
                  <TableHead className="text-gray-800 font-semibold print:text-xs hidden md:table-cell print:table-cell">SKU</TableHead>
                  <TableHead className="text-gray-800 font-semibold print:text-xs text-right">Qty</TableHead>
                  <TableHead className="text-gray-800 font-semibold print:text-xs text-right">Cost Price</TableHead>
                  <TableHead className="text-gray-800 font-semibold print:text-xs text-right hidden md:table-cell print:table-cell">Retail Price</TableHead>
                  <TableHead className="text-gray-800 font-semibold print:text-xs text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchase.items.map((item, index) => (
                  <TableRow key={item.id} className="border-b print:border-gray-300">
                    <TableCell className="text-gray-700 print:text-xs">{index + 1}</TableCell>
                    <TableCell className="text-gray-700 font-medium print:text-xs">{item.product.name}</TableCell>
                    <TableCell className="text-gray-700 print:text-xs hidden md:table-cell print:table-cell">{item.product.sku}</TableCell>
                    <TableCell className="text-gray-700 text-right print:text-xs">
                      {item.quantity} {item.product.uom.symbol}
                    </TableCell>
                    <TableCell className="text-gray-700 text-right print:text-xs">{formatCurrency(Number(item.costPrice || 0))}</TableCell>
                    <TableCell className="text-gray-700 text-right print:text-xs hidden md:table-cell print:table-cell">{formatCurrency(Number(item.retailPrice || 0))}</TableCell>
                    <TableCell className="text-gray-700 font-semibold text-right print:text-xs">{formatCurrency(Number(item.totalPrice || 0))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 print:gap-6">
          <div>
            {purchase.remarks && (
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-2 print:text-base print:mb-1">Remarks:</h3>
                <p className="text-gray-700 bg-gray-50 p-3 rounded-lg print:bg-transparent print:p-2 print:text-sm print:border print:border-gray-300 print:rounded">
                  {purchase.remarks}
                </p>
              </div>
            )}
          </div>
          <div>
            <div className="bg-gray-50 p-4 rounded-lg print:bg-transparent print:p-0 print:border print:border-gray-300 print:rounded">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 print:text-base print:mb-3">Order Summary:</h3>
              <div className="space-y-2 print:text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-700">Subtotal:</span>
                  <span className="text-gray-700 font-medium">{formatCurrency(Number(subtotal || 0))}</span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">Tax:</span>
                    <span className="text-gray-700 font-medium">{formatCurrency(Number(tax || 0))}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-700">Discount:</span>
                    <span className="text-gray-700 font-medium">-{formatCurrency(Number(discount || 0))}</span>
                  </div>
                )}
                <div className="border-t-2 border-gray-400 pt-2 print:border-gray-600">
                  <div className="flex justify-between">
                    <span className="text-lg font-bold text-gray-900 print:text-base">Total:</span>
                    <span className="text-lg font-bold text-gray-900 print:text-base">{formatCurrency(Number(total || 0))}</span>
                  </div>
                </div>
                {purchase.amountPaid > 0 && (
                  <div className="flex justify-between pt-1">
                    <span className="text-gray-700">Amount Paid:</span>
                    <span className="text-gray-700 font-medium">{formatCurrency(Number(purchase.amountPaid || 0))}</span>
                  </div>
                )}
                {purchase.amountPaid > 0 && purchase.amountPaid < total && (
                  <div className="flex justify-between pt-1">
                    <span className="text-gray-700 font-semibold">Balance Due:</span>
                    <span className="text-gray-700 font-bold">{formatCurrency(Number((total - purchase.amountPaid) || 0))}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-6 border-t-2 border-gray-300 text-center text-gray-600 print:mt-8 print:pt-4 print:text-sm">
          <p className="font-medium">Thank you for your business!</p>
          <p className="text-xs mt-2 print:text-xs">
            Invoice generated on {format(new Date(), 'MMM dd, yyyy')} at {format(new Date(), 'h:mm a')}
          </p>
        </div>
      </div>
      </div>
    </>
  )
}
