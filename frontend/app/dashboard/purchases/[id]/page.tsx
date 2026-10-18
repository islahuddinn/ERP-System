'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  usePurchase,
  useDeletePurchase,
  useUpdatePurchaseStatus,
  useGetPayments,
  useAddPayment,
  useUpdatePayment,
  useApprovePurchaseOrder,
  type PaymentMethod,
  type PurchaseOrderApproval,
  type PurchaseStatus,
} from '@/hooks/usePurchases'
import { useBankAccounts } from '@/hooks/useBankAccounts'
import { useAuth } from '@/contexts/auth-context'
import { formatCurrency } from '@/lib/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Package,
  Truck,
  Loader2,
  Printer,
  CheckCircle,
  XCircle,
  CreditCard,
  PlusCircle,
  ShieldCheck,
  Clock,
  RefreshCw,
} from 'lucide-react'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import { format } from 'date-fns'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { apiClient } from '@/lib/api-client'
import { userResolver } from '@/lib/user-resolver'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// Safe date formatter — date-fns `format` throws on invalid/missing dates, which would
// crash the detail page render and trigger the global error boundary ("Something went
// wrong", QA #22). Guard every date the API might return null/invalid for.
const safeFormat = (value: unknown, pattern: string): string => {
  // Guard against null/undefined AND the literal strings "null"/"" the API sometimes
  // serialises for undecided approvals (QA #24/#25) — otherwise date-fns would render
  // "Invalid Date" or the raw text.
  if (value === null || value === undefined || value === '' || value === 'null') return '—'
  const d = new Date(value as string)
  return isNaN(d.getTime()) ? '—' : format(d, pattern)
}

// Display a text value, treating null/undefined and the literal strings "null"/"" (which the
// API can serialise for undecided approval remarks) as empty → em dash (QA #24/#25).
const safeText = (value: unknown): string => {
  if (value === null || value === undefined) return '—'
  const s = String(value).trim()
  return s === '' || s === 'null' ? '—' : s
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700 border-gray-200',
  CONFIRMED: 'bg-blue-100 text-blue-700 border-blue-200',
  PARTIAL: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  RECEIVED: 'bg-green-100 text-green-700 border-green-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
}

// All PO statuses shown in the Update Status dropdown. Every status is listed so the
// user sees the full set; only the ones that are valid transitions from the current
// status are selectable (the rest are disabled) — mirrors PATCH /:id/status rules.
const ALL_PO_STATUSES = ['DRAFT', 'CONFIRMED', 'PARTIAL', 'RECEIVED', 'CANCELLED'] as const
const PO_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Draft',
  CONFIRMED: 'Confirmed',
  PARTIAL: 'Partial',
  RECEIVED: 'Received',
  CANCELLED: 'Cancelled',
}

const PAYMENT_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-700 border-gray-200',
  PARTIAL: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  PAID: 'bg-green-100 text-green-700 border-green-200',
  REFUNDED: 'bg-blue-100 text-blue-700 border-blue-200',
  CANCELLED: 'bg-red-100 text-red-700 border-red-200',
}

const APPROVAL_STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  APPROVED: 'bg-green-100 text-green-700 border-green-200',
  REJECTED: 'bg-red-100 text-red-700 border-red-200',
}

// Payment methods that a supplier bank account can be attached to. Mirrors the backend
// BANK_ACCOUNT_METHODS rule (BANK_TRANSFER/CHEQUE only) — the dropdown is hidden otherwise.
const BANK_ACCOUNT_METHODS: PaymentMethod[] = ['BANK_TRANSFER', 'CHEQUE']

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'CASH', label: 'Cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'CARD', label: 'Card' },
  { value: 'MOBILE_PAYMENT', label: 'Mobile Payment' },
  { value: 'CREDIT', label: 'Credit' },
  { value: 'OTHER', label: 'Other' },
]

export default function PurchaseOrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const { data: purchaseOrder, isLoading, error } = usePurchase(id)
  const deleteMutation = useDeletePurchase()
  const statusMutation = useUpdatePurchaseStatus()
  const { data: payments = [] } = useGetPayments(id)
  const addPaymentMutation = useAddPayment()
  const updatePaymentMutation = useUpdatePayment()
  const approveMutation = useApprovePurchaseOrder()
  const { user: currentUser } = useAuth()
  const currentUserId = currentUser?.id

  // Load the PO supplier's bank accounts so the Add/Edit Payment dialogs can offer them
  // for BANK_TRANSFER/CHEQUE payments (QA #32). The hook is disabled until a supplierId exists.
  const supplierId = purchaseOrder?.supplierId ?? purchaseOrder?.supplier?.id ?? ''
  const { data: supplierBankAccounts = [] } = useBankAccounts('suppliers', supplierId)

  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  // Unified "Update Status" dialog — the Status dropdown lives inside this dialog (QA #39).
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [targetStatus, setTargetStatus] = useState<string>('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState<number>(0)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | ''>('')
  const [paymentRef, setPaymentRef] = useState('')
  const [paymentBankAccountId, setPaymentBankAccountId] = useState<string>('')
  const [paymentNotes, setPaymentNotes] = useState('')
  // Edit-payment dialog state
  const [editPayment, setEditPayment] = useState<any | null>(null)
  const [editAmount, setEditAmount] = useState<number>(0)
  const [editMethod, setEditMethod] = useState<PaymentMethod>('CASH')
  const [editRef, setEditRef] = useState('')
  const [editBankAccountId, setEditBankAccountId] = useState<string>('')
  const [editNotes, setEditNotes] = useState('')
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [rejectRemarks, setRejectRemarks] = useState('')
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [approveRemarks, setApproveRemarks] = useState('')

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Purchase order deleted')
      router.push('/dashboard/purchases')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to delete purchase order')
    }
  }

  const handleStatusConfirm = async () => {
    if (!targetStatus) return
    try {
      await statusMutation.mutateAsync({ id, status: targetStatus as PurchaseStatus })
      toast.success(
        targetStatus === 'CONFIRMED'
          ? 'Purchase order confirmed'
          : targetStatus === 'CANCELLED'
            ? 'Purchase order cancelled'
            : targetStatus === 'RECEIVED'
              ? 'Purchase order marked as received'
              : 'Purchase order status updated',
      )
      setStatusDialogOpen(false)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update purchase order status')
    }
  }

  // Reset the Add Payment form fields to their defaults. Called whenever the dialog
  // opens or closes so previously entered values never persist across reopens (QA #25).
  const resetPaymentForm = () => {
    setPaymentAmount(0)
    setPaymentMethod('')
    setPaymentRef('')
    setPaymentBankAccountId('')
    setPaymentNotes('')
  }

  const handleAddPayment = async () => {
    if (paymentAmount === null || paymentAmount === undefined || isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Payment amount must be greater than 0')
      return
    }
    if (!paymentMethod) {
      toast.error('Payment method is required')
      return
    }
    try {
      await addPaymentMutation.mutateAsync({
        id,
        data: {
          amount: paymentAmount,
          paymentMethod: paymentMethod as PaymentMethod,
          referenceNumber: paymentRef || undefined,
          // Only send the bank account for bank-style methods (backend rejects it otherwise).
          bankAccountId: BANK_ACCOUNT_METHODS.includes(paymentMethod as PaymentMethod) && paymentBankAccountId
            ? paymentBankAccountId
            : undefined,
          notes: paymentNotes || undefined,
        },
      })
      toast.success('Payment recorded')
      setShowPaymentModal(false)
      resetPaymentForm()
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to add payment')
    }
  }

  const openEditPayment = (p: any) => {
    setEditPayment(p)
    setEditAmount(Number(p.amount) || 0)
    setEditMethod((p.paymentMethod as PaymentMethod) || 'CASH')
    setEditRef(p.referenceNumber ?? '')
    setEditBankAccountId(p.bankAccountId ?? '')
    setEditNotes(p.notes ?? '')
  }

  const handleUpdatePayment = async () => {
    if (!editPayment) return
    if (!editAmount || editAmount <= 0) {
      toast.error('Enter a valid payment amount')
      return
    }
    try {
      await updatePaymentMutation.mutateAsync({
        purchaseOrderId: id,
        paymentId: editPayment.id,
        data: {
          amount: editAmount,
          paymentMethod: editMethod,
          referenceNumber: editRef || undefined,
          // Only send the bank account for bank-style methods (backend rejects it otherwise).
          bankAccountId: BANK_ACCOUNT_METHODS.includes(editMethod) && editBankAccountId
            ? editBankAccountId
            : undefined,
          notes: editNotes || undefined,
        },
      })
      toast.success('Payment updated')
      setEditPayment(null)
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to update payment')
    }
  }

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync({
        id,
        decision: 'APPROVED',
        remarks: approveRemarks || undefined,
      })
      toast.success('Purchase order approved')
      setShowApproveDialog(false)
      setApproveRemarks('')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to approve purchase order')
    }
  }

  const handleReject = async () => {
    try {
      await approveMutation.mutateAsync({
        id,
        decision: 'REJECTED',
        remarks: rejectRemarks || undefined,
      })
      toast.success('Purchase order rejected')
      setShowRejectDialog(false)
      setRejectRemarks('')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to reject purchase order')
    }
  }

  const handlePrintPDF = async () => {
    try {
      const res = await apiClient.get(`/purchase-orders/${id}/pdf`, { responseType: 'blob' })
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${purchaseOrder?.orderNumber || 'purchase-order'}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to download PDF')
    }
  }

  if (isLoading) {
    return (
      <ProtectedRoute>
        <div className="factory-section">
          <div className="factory-page-container flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (error || !purchaseOrder) {
    return (
      <ProtectedRoute>
        <div className="factory-section">
          <div className="factory-page-container flex items-center justify-center h-64">
            <div className="text-center">
              <p className="text-red-500 mb-4">Purchase order not found</p>
              <Button onClick={() => router.push('/dashboard/purchases')}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Purchases
              </Button>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  const isDraft = purchaseOrder.status === 'DRAFT'
  const canEdit = isDraft
  const canDelete = isDraft
  // A PO is "rejected" when any assigned approver has REJECTED it. Rejection does not change
  // the PO status (it stays DRAFT) — the rejected state lives on the approvals[] rows. A rejected
  // PO must not be confirmable until it is edited (which resets approvals back to PENDING) (QA #8).
  const isRejected = (purchaseOrder.approvals ?? []).some(
    (a: PurchaseOrderApproval) => a.status === 'REJECTED',
  )
  // Valid status transitions exposed in the "Update Status" dropdown, mirroring the
  // backend PATCH /purchase-orders/:id/status transition map:
  //   DRAFT → CONFIRMED | CANCELLED. Once CONFIRMED/PARTIAL there is NO manual transition —
  // receiving happens ONLY via GRN creation, which auto-advances the PO to PARTIAL/RECEIVED.
  // We therefore never surface a "Mark as Received" option (QA #18/#19/#32). Cancelling is
  // only offered while DRAFT — once CONFIRMED/PARTIAL the backend rejects a cancel (QA #3).
  const statusOptions: { value: string; label: string }[] = (() => {
    switch (purchaseOrder.status) {
      case 'DRAFT':
        return [
          // Hide "Confirm Order" while the PO has a rejected approval — confirming a
          // rejected PO is blocked by the backend (QA #8/#9).
          ...(isRejected ? [] : [{ value: 'CONFIRMED', label: 'Confirm Order' }]),
          { value: 'CANCELLED', label: 'Cancel Order' },
        ]
      default:
        return []
    }
  })()
  // A PO can have at most one GRN. Once a GRN exists, hide the Create GRN action (QA #3).
  const hasGrn = (purchaseOrder._count?.grns ?? 0) > 0
  const canCreateGrn =
    (purchaseOrder.status === 'CONFIRMED' || purchaseOrder.status === 'PARTIAL') && !hasGrn
  const canAddPayment = purchaseOrder.paymentStatus !== 'PAID' && purchaseOrder.status !== 'CANCELLED'
  // Recorded payments can be corrected unless the PO is cancelled.
  const canEditPayment = purchaseOrder.status !== 'CANCELLED'

  const approvals: PurchaseOrderApproval[] = purchaseOrder.approvals ?? []
  const hasApprovals = approvals.length > 0
  // The approval row belonging to the logged-in user (if they are an assigned approver).
  const myApproval = currentUserId
    ? approvals.find((a) => a.approverId === currentUserId)
    : undefined
  // Show approve/reject only while the PO is DRAFT and the current user still has a PENDING decision.
  const canDecide = isDraft && myApproval?.status === 'PENDING'

  return (
    <ProtectedRoute>
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-4">
                <Button variant="ghost" onClick={() => router.push('/dashboard/purchases')}>
                  <ArrowLeft className="h-4 w-4 mr-2" /> Back
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                    <Package className="h-8 w-8 text-green-600" />
                    {purchaseOrder.orderNumber}
                  </h1>
                  <p className="text-gray-600 mt-1">Purchase Order Details</p>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <ViewHistoryButton entityName="PurchaseOrder" entityId={id} size="default" />
                <Button variant="outline" onClick={handlePrintPDF}>
                  <Printer className="h-4 w-4 mr-2" /> Print PDF
                </Button>
                {canEdit && (
                  <Link href={`/dashboard/purchases/${id}/edit`}>
                    <Button variant="outline">
                      <Edit className="h-4 w-4 mr-2" /> Edit
                    </Button>
                  </Link>
                )}
                {statusOptions.length > 0 && (
                  <Button
                    variant="outline"
                    disabled={statusMutation.isPending}
                    onClick={() => {
                      // Preselect the first valid transition; the dialog's dropdown lets the user change it.
                      setTargetStatus(statusOptions[0]?.value ?? '')
                      setStatusDialogOpen(true)
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" /> Update Status
                  </Button>
                )}
                {canCreateGrn && (
                  <Link href={`/dashboard/factory/receiving/create?poId=${id}`}>
                    <Button className="bg-green-600 hover:bg-green-700 text-white">
                      <Package className="h-4 w-4 mr-2" /> Create GRN
                    </Button>
                  </Link>
                )}
                {canDelete && (
                  <Button
                    variant="outline"
                    onClick={() => setShowDeleteDialog(true)}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> Delete
                  </Button>
                )}
              </div>
            </div>

            {/* Order Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Order Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Order Number</p>
                      <p className="font-medium text-gray-900">{purchaseOrder.orderNumber}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Order Date</p>
                      <p className="font-medium text-gray-900">
                        {safeFormat(purchaseOrder.orderDate, 'MMM dd, yyyy')}
                      </p>
                    </div>
                    {purchaseOrder.expectedDate && (
                      <div>
                        <p className="text-sm text-gray-500">Expected Date</p>
                        <p className="font-medium text-gray-900">
                          {safeFormat(purchaseOrder.expectedDate, 'MMM dd, yyyy')}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-500">Status</p>
                      <Badge className={`font-medium ${STATUS_STYLES[purchaseOrder.status] ?? 'bg-gray-100 text-gray-700'}`}>
                        {purchaseOrder.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Payment Status</p>
                      <Badge className={`font-medium ${PAYMENT_STATUS_STYLES[purchaseOrder.paymentStatus] ?? 'bg-gray-100 text-gray-700'}`}>
                        {purchaseOrder.paymentStatus}
                      </Badge>
                    </div>
                    {purchaseOrder.remarks && (
                      <div className="col-span-2">
                        <p className="text-sm text-gray-500">Remarks</p>
                        <p className="text-gray-900">{purchaseOrder.remarks}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="h-5 w-5 text-green-600" /> Supplier Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Supplier Name</p>
                    <Link href={`/dashboard/suppliers/${purchaseOrder.supplier?.id}`}>
                      <p className="font-medium text-gray-900 hover:text-green-600 cursor-pointer">
                        {purchaseOrder.supplier?.name ?? purchaseOrder.supplierName ?? '—'}
                      </p>
                    </Link>
                  </div>
                  {purchaseOrder.supplier?.contactPerson && (
                    <div>
                      <p className="text-sm text-gray-500">Contact Person</p>
                      <p className="font-medium text-gray-900">{purchaseOrder.supplier.contactPerson}</p>
                    </div>
                  )}
                  {purchaseOrder.supplier?.email && (
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="font-medium text-gray-900">{purchaseOrder.supplier.email}</p>
                    </div>
                  )}
                  {purchaseOrder.supplier?.phone && (
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <p className="font-medium text-gray-900">{purchaseOrder.supplier.phone}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Items Table */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-green-600" /> Order Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 border-gray-200">
                      <TableHead className="font-semibold text-gray-700">Raw Material</TableHead>
                      <TableHead className="font-semibold text-gray-700">Code</TableHead>
                      <TableHead className="font-semibold text-gray-700">Ordered</TableHead>
                      <TableHead className="font-semibold text-gray-700">Received</TableHead>
                      <TableHead className="font-semibold text-gray-700">Unit Price</TableHead>
                      <TableHead className="font-semibold text-gray-700 text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchaseOrder.items?.map((item: any) => (
                      <TableRow key={item.id} className="border-gray-100">
                        <TableCell className="font-medium text-gray-900">
                          {item.rawMaterial?.name ?? '—'}
                        </TableCell>
                        <TableCell className="text-gray-600">{item.rawMaterial?.code ?? '—'}</TableCell>
                        <TableCell className="text-gray-600">
                          {item.quantity} {item.rawMaterial?.uom?.symbol ?? ''}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {item.receivedQty ?? 0} {item.rawMaterial?.uom?.symbol ?? ''}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {formatCurrency(Number(item.unitPrice ?? 0))}
                        </TableCell>
                        <TableCell className="font-medium text-gray-900 text-right">
                          {formatCurrency(Number(item.totalPrice ?? 0))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="mt-4 flex justify-end">
                  <div className="w-72 space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(Number(purchaseOrder.subTotal ?? purchaseOrder.totalAmount ?? 0))}</span>
                    </div>
                    {Number(purchaseOrder.shippingCost) > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Shipping:</span>
                        <span>{formatCurrency(Number(purchaseOrder.shippingCost))}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg text-gray-900 pt-2 border-t">
                      <span>Total:</span>
                      <span>{formatCurrency(Number(purchaseOrder.totalAmount ?? 0))}</span>
                    </div>
                    {Number(purchaseOrder.amountPaid) > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Amount Paid:</span>
                        <span className="text-green-600">
                          {formatCurrency(Number(purchaseOrder.amountPaid))}
                        </span>
                      </div>
                    )}
                    {Number(purchaseOrder.remainingAmount) > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Remaining:</span>
                        <span className="text-red-600">
                          {formatCurrency(Number(purchaseOrder.remainingAmount))}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payments */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-green-600" /> Payments
                </CardTitle>
                {canAddPayment && (
                  <Button size="sm" onClick={() => setShowPaymentModal(true)}>
                    <PlusCircle className="h-4 w-4 mr-1" /> Add Payment
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                {payments.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">No payments recorded</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold text-gray-700">Date</TableHead>
                        <TableHead className="font-semibold text-gray-700">Method</TableHead>
                        <TableHead className="font-semibold text-gray-700">Amount</TableHead>
                        <TableHead className="font-semibold text-gray-700">Reference</TableHead>
                        <TableHead className="font-semibold text-gray-700">Notes</TableHead>
                        {canEditPayment && <TableHead className="text-right font-semibold text-gray-700">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.map((p: any) => (
                        <TableRow key={p.id}>
                          <TableCell>{safeFormat(p.paymentDate, 'MMM dd, yyyy')}</TableCell>
                          <TableCell>{p.paymentMethod}</TableCell>
                          <TableCell className="font-medium">
                            {formatCurrency(Number(p.amount))}
                          </TableCell>
                          <TableCell className="text-gray-600">{p.referenceNumber ?? '—'}</TableCell>
                          <TableCell className="text-gray-600">{p.notes ?? '—'}</TableCell>
                          {canEditPayment && (
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditPayment(p)}
                                className="text-gray-600 hover:text-gray-900"
                                title="Edit payment"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Approvals */}
            {hasApprovals && (
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-green-600" /> Approvals
                  </CardTitle>
                  {canDecide && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => { setApproveRemarks(''); setShowApproveDialog(true) }}
                        disabled={approveMutation.isPending}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {approveMutation.isPending ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <CheckCircle className="h-4 w-4 mr-1" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowRejectDialog(true)}
                        disabled={approveMutation.isPending}
                        className="border-red-300 text-red-700 hover:bg-red-50"
                      >
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </CardHeader>
                <CardContent>
                  {isDraft && (
                    <p className="text-sm text-gray-500 mb-3">
                      This order auto-confirms once all assigned approvers approve. Any rejection keeps it in DRAFT.
                    </p>
                  )}
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold text-gray-700">Approver</TableHead>
                        <TableHead className="font-semibold text-gray-700">Status</TableHead>
                        <TableHead className="font-semibold text-gray-700">Decided</TableHead>
                        <TableHead className="font-semibold text-gray-700">Remarks</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {approvals.map((a) => (
                        <TableRow key={a.id} className="border-gray-100">
                          <TableCell className="font-medium text-gray-900">
                            {[a.approver?.firstName, a.approver?.lastName].filter(Boolean).join(' ') ||
                              a.approver?.name ||
                              a.approver?.email ||
                              userResolver.getUserName(a.approverId)}
                            {currentUserId && a.approverId === currentUserId && (
                              <span className="ml-2 text-xs text-gray-400">(you)</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={`font-medium ${
                                APPROVAL_STATUS_STYLES[a.status] ?? 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {a.status === 'PENDING' && <Clock className="h-3 w-3 mr-1" />}
                              {a.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-gray-600">
                            {safeFormat(a.decidedAt, 'MMM dd, yyyy hh:mm a')}
                          </TableCell>
                          <TableCell className="text-gray-600">{safeText(a.remarks)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Created By */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="pt-6">
                <div className="text-sm text-gray-500">
                  Created by {[purchaseOrder.createdBy?.firstName, purchaseOrder.createdBy?.lastName].filter(Boolean).join(' ') ||
                    purchaseOrder.createdBy?.name ||
                    purchaseOrder.createdBy?.email ||
                    userResolver.getUserName(purchaseOrder.createdById || '')} on{' '}
                  {safeFormat(purchaseOrder.createdAt, 'MMM dd, yyyy hh:mm a')}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Purchase Order</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this purchase order? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Payment Dialog */}
      <Dialog
        open={showPaymentModal}
        onOpenChange={(open) => {
          setShowPaymentModal(open)
          // Clear the form on every open/close so stale values never persist (QA #25).
          resetPaymentForm()
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>
              Record a payment for order {purchaseOrder.orderNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-gray-700">Amount *</Label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                value={paymentAmount || ''}
                onChange={e => {
                  const v = parseFloat(e.target.value)
                  // Never store a negative amount — clamp to 0 so submit validation blocks it (QA #55).
                  setPaymentAmount(isNaN(v) || v < 0 ? 0 : v)
                }}
                className="mt-1.5"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label className="text-gray-700">Payment Method *</Label>
              <Select value={paymentMethod || undefined} onValueChange={v => setPaymentMethod(v as PaymentMethod)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select Payment Method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-gray-700">Reference Number (optional)</Label>
              <Input
                value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)}
                placeholder="e.g. TXN-12345"
                className="mt-1.5"
              />
            </div>
            {BANK_ACCOUNT_METHODS.includes(paymentMethod as PaymentMethod) && (
            <div>
              <Label className="text-gray-700">Bank Account (optional)</Label>
              <Select
                value={paymentBankAccountId || 'none'}
                onValueChange={v => setPaymentBankAccountId(v === 'none' ? '' : v)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                  <SelectItem value="none">None</SelectItem>
                  {supplierBankAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.bankName} — {acc.accountTitle} ({acc.accountNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {supplierBankAccounts.length === 0 && (
                <p className="mt-1 text-xs text-gray-400">No bank accounts on file for this supplier.</p>
              )}
            </div>
            )}
            <div>
              <Label className="text-gray-700">Notes (optional)</Label>
              <Input
                value={paymentNotes}
                onChange={e => setPaymentNotes(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowPaymentModal(false); resetPaymentForm() }}>Cancel</Button>
            <Button onClick={handleAddPayment} disabled={addPaymentMutation.isPending || paymentAmount <= 0 || !paymentMethod}>
              {addPaymentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Payment Dialog */}
      <Dialog open={!!editPayment} onOpenChange={(open) => { if (!open) setEditPayment(null) }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Payment</DialogTitle>
            <DialogDescription>
              Update this payment for order {purchaseOrder.orderNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Amount *</Label>
              <Input
                type="number"
                min={0.01}
                step="0.01"
                value={editAmount || ''}
                onChange={e => setEditAmount(parseFloat(e.target.value) || 0)}
                className="mt-1.5"
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Payment Method *</Label>
              <Select value={editMethod} onValueChange={v => setEditMethod(v as PaymentMethod)}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select Payment Method" />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reference Number (optional)</Label>
              <Input
                value={editRef}
                onChange={e => setEditRef(e.target.value)}
                placeholder="e.g. TXN-12345"
                className="mt-1.5"
              />
            </div>
            {BANK_ACCOUNT_METHODS.includes(editMethod) && (
            <div>
              <Label className="text-gray-700">Bank Account (optional)</Label>
              <Select
                value={editBankAccountId || 'none'}
                onValueChange={v => setEditBankAccountId(v === 'none' ? '' : v)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                  <SelectItem value="none">None</SelectItem>
                  {supplierBankAccounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.bankName} — {acc.accountTitle} ({acc.accountNumber})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {supplierBankAccounts.length === 0 && (
                <p className="mt-1 text-xs text-gray-400">No bank accounts on file for this supplier.</p>
              )}
            </div>
            )}
            <div>
              <Label>Notes (optional)</Label>
              <Input
                value={editNotes}
                onChange={e => setEditNotes(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditPayment(null)}>Cancel</Button>
            <Button onClick={handleUpdatePayment} disabled={updatePaymentMutation.isPending || editAmount <= 0}>
              {updatePaymentMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Approval Dialog */}
      <Dialog
        open={showApproveDialog}
        onOpenChange={(open) => {
          setShowApproveDialog(open)
          // Clear the remark on every open/close so a previous note never persists (mirrors reject).
          setApproveRemarks('')
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Purchase Order</DialogTitle>
            <DialogDescription>
              You are about to record your decision as <span className="font-medium text-green-700">APPROVED</span> for
              order {purchaseOrder.orderNumber}. The order auto-confirms once all assigned approvers approve. Add an
              optional remark.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-gray-700">Status</Label>
              <Input value="APPROVED" readOnly className="mt-1.5 bg-gray-50 font-medium text-green-700" />
            </div>
            <div>
              <Label className="text-gray-700">Remarks (optional)</Label>
              <Textarea
                value={approveRemarks}
                onChange={e => setApproveRemarks(e.target.value)}
                placeholder="Add an approval note..."
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveDialog(false)}>Cancel</Button>
            <Button
              onClick={handleApprove}
              disabled={approveMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {approveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Approval Dialog */}
      <Dialog
        open={showRejectDialog}
        onOpenChange={(open) => {
          setShowRejectDialog(open)
          // Always clear the remark on open/close so a previously typed reason never
          // persists into the next reject attempt (QA #44).
          setRejectRemarks('')
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Purchase Order</DialogTitle>
            <DialogDescription>
              Rejecting will keep order {purchaseOrder.orderNumber} in DRAFT. Add an optional remark.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-gray-700">Status</Label>
              <Input value="REJECTED" readOnly className="mt-1.5 bg-gray-50 font-medium text-red-700" />
            </div>
            <div>
              <Label className="text-gray-700">Remarks (optional)</Label>
              <Textarea
                value={rejectRemarks}
                onChange={e => setRejectRemarks(e.target.value)}
                placeholder="Reason for rejection..."
                className="mt-1.5"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRejectDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={approveMutation.isPending}>
              {approveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog — the Status dropdown lives inside the dialog body (QA #39). */}
      <Dialog
        open={statusDialogOpen}
        onOpenChange={(open) => {
          setStatusDialogOpen(open)
          if (!open) setTargetStatus('')
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Purchase Order Status</DialogTitle>
            <DialogDescription>
              Change the status of order {purchaseOrder.orderNumber}. Select the new status below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-gray-700">Status</Label>
              <Select value={targetStatus} onValueChange={setTargetStatus}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                  {ALL_PO_STATUSES.map((s) => {
                    // Only statuses that are valid transitions from the current one are
                    // selectable; the current status and invalid targets are disabled.
                    const selectable = statusOptions.some((o) => o.value === s)
                    return (
                      <SelectItem key={s} value={s} disabled={!selectable}>
                        {PO_STATUS_LABELS[s]}
                        {s === purchaseOrder.status ? ' (current)' : ''}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            {targetStatus === 'CONFIRMED' && (
              <p className="text-sm text-gray-500">This will move the order to CONFIRMED status.</p>
            )}
            {targetStatus === 'CANCELLED' && (
              <p className="text-sm text-gray-500">This will cancel the order. This action cannot be undone.</p>
            )}
            {targetStatus === 'RECEIVED' && (
              <p className="text-sm text-gray-500">This will move the order to RECEIVED status.</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleStatusConfirm}
              disabled={!targetStatus || statusMutation.isPending}
              className={
                targetStatus === 'CANCELLED'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }
            >
              {statusMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {targetStatus === 'CONFIRMED'
                ? 'Confirm Order'
                : targetStatus === 'CANCELLED'
                  ? 'Cancel Order'
                  : targetStatus === 'RECEIVED'
                    ? 'Mark as Received'
                    : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  )
}
