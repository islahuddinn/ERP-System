'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useConfirm } from '@/components/ui/confirm-provider'
import { toast } from 'react-hot-toast'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Eye,
  Trash2,
  RotateCcw,
  CheckCircle,
  XCircle,
  Plus,
  Pencil,
} from 'lucide-react'
import { format } from 'date-fns'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ModuleListShell } from '@/components/ui/module-list-shell'
import { DataTable, type DataTableColumn, type DataTableFilter } from '@/components/ui/data-table'
import { useDataTable } from '@/hooks/useDataTable'
import { useUrlStatusTabs, useListQueryParams } from '@/hooks/useUrlStatusTabs'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import {
  usePurchaseReturns,
  useDeletePurchaseReturn,
  useUpdateReturnStatus,
  useApprovePurchaseReturn,
  usePurchasesDropdown,
  type ReturnStatus,
  type ApprovalDecision,
  type PurchaseReturnApproval,
} from '@/hooks/usePurchases'
import { useGrns } from '@/hooks/useMaterialReceiving'
import { useSuppliersDropdown } from '@/hooks/useSuppliers'
import { useAuth } from '@/contexts/auth-context'
import { formatCurrency } from '@/lib/currency'

const BASE_PATH = '/dashboard/purchases/returns/list'

const STATUS_TABS = [
  { value: 'all', label: 'All Returns' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

interface PurchaseReturnItem {
  id: string
  rawMaterial?: { id: string; name: string; code: string }
  quantity: number
  unitPrice: number
  totalPrice: number
  reason?: string
}

interface ReturnSupplier {
  id: string
  name: string
  contactPerson?: string
  phone?: string
  email?: string
}

interface PurchaseReturn {
  id: string
  returnNumber: string
  purchaseOrder?: { id: string; orderNumber: string; supplierName?: string; supplier?: ReturnSupplier }
  supplier?: ReturnSupplier
  returnDate: string
  reason: string
  totalAmount: number
  status: ReturnStatus
  remarks?: string
  items?: PurchaseReturnItem[]
  approvals?: PurchaseReturnApproval[]
  createdAt: string
}

const getReturnSupplier = (ret?: PurchaseReturn | null): ReturnSupplier | undefined =>
  ret?.supplier ?? ret?.purchaseOrder?.supplier

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 border-gray-200',
  APPROVED: 'bg-green-100 text-green-800 border-green-200',
  REJECTED: 'bg-red-100 text-red-800 border-red-200',
  COMPLETED: 'bg-blue-100 text-blue-800 border-blue-200',
  CANCELLED: 'bg-red-100 text-red-800 border-red-200',
}

export default function PurchaseReturnListPage() {
  const router = useRouter()
  const confirm = useConfirm()
  const { user: currentUser } = useAuth()
  const currentUserId = currentUser?.id

  const controller = useDataTable({ initialLimit: 20, initialSortBy: 'returnDate', initialSortOrder: 'DESC' })
  const statusTabs = useUrlStatusTabs({ basePath: BASE_PATH })
  const queryParams = useListQueryParams(controller, statusTabs)

  const { data: returnsData, isLoading, isError } = usePurchaseReturns(
    queryParams as Parameters<typeof usePurchaseReturns>[0],
  )
  const deleteMutation = useDeletePurchaseReturn()
  const statusMutation = useUpdateReturnStatus()
  const approveMutation = useApprovePurchaseReturn()

  const { data: suppliers = [] } = useSuppliersDropdown()
  const { data: poOptions = [] } = usePurchasesDropdown()
  const { data: grnData } = useGrns({ limit: 100 })
  const grnOptions = (grnData?.data ?? []) as Array<{
    id: string
    receivingNumber: string
    purchaseOrder?: { orderNumber?: string }
  }>

  const returns = (returnsData?.data ?? []) as PurchaseReturn[]
  const meta = returnsData?.meta

  const [selectedReturn, setSelectedReturn] = useState<PurchaseReturn | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const [statusDialogReturn, setStatusDialogReturn] = useState<PurchaseReturn | null>(null)
  const [statusDecision, setStatusDecision] = useState<ReturnStatus | ''>('')
  const [statusRemarks, setStatusRemarks] = useState('')
  const [approvalDialog, setApprovalDialog] = useState<{ ret: PurchaseReturn; decision: ApprovalDecision } | null>(null)
  const [approvalRemarks, setApprovalRemarks] = useState('')

  const myPendingApproval = (ret: PurchaseReturn): boolean =>
    !!currentUserId &&
    ret.status === 'DRAFT' &&
    (ret.approvals?.some((a) => a.approverId === currentUserId && a.status === 'PENDING') ?? false)

  const allowedTransitions = (status: ReturnStatus): ReturnStatus[] => {
    switch (status) {
      case 'DRAFT':
        return ['APPROVED', 'REJECTED', 'CANCELLED']
      case 'APPROVED':
        return ['COMPLETED', 'CANCELLED']
      default:
        return []
    }
  }

  const openApprovalDialog = (ret: PurchaseReturn, decision: ApprovalDecision) => {
    setApprovalDialog({ ret, decision })
    setApprovalRemarks('')
  }

  const submitApproval = () => {
    if (!approvalDialog) return
    const { ret, decision } = approvalDialog
    approveMutation.mutate(
      { returnId: ret.id, decision, remarks: approvalRemarks.trim() || undefined },
      {
        onSuccess: () => {
          toast.success(decision === 'APPROVED' ? 'Return approved' : 'Return rejected')
          setApprovalDialog(null)
        },
        onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to submit decision'),
      },
    )
  }

  const handleDelete = async (id: string) => {
    if (
      await confirm({
        title: 'Delete Purchase Return',
        description: 'Are you sure you want to delete this purchase return?',
        confirmLabel: 'Delete',
      })
    ) {
      deleteMutation.mutate(id, {
        onSuccess: () => toast.success('Purchase return deleted'),
        onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to delete'),
      })
    }
  }

  const openStatusDialog = (ret: PurchaseReturn) => {
    const options = allowedTransitions(ret.status)
    setStatusDialogReturn(ret)
    setStatusDecision(options[0] ?? '')
    setStatusRemarks('')
  }

  const submitStatusUpdate = () => {
    if (!statusDialogReturn || !statusDecision) return
    const trimmed = statusRemarks.trim()
    statusMutation.mutate(
      {
        returnId: statusDialogReturn.id,
        status: statusDecision,
        reason: trimmed || undefined,
      },
      {
        onSuccess: () => {
          toast.success(`Status updated to ${statusDecision}`)
          setStatusDialogReturn(null)
        },
        onError: (e: any) => toast.error(e?.response?.data?.message || 'Failed to update status'),
      },
    )
  }

  const filters: DataTableFilter<PurchaseReturn>[] = [
    {
      key: 'supplierId',
      label: 'Supplier',
      searchable: true,
      options: suppliers.map((s) => ({ value: s.id, label: s.name })),
    },
    {
      key: 'purchaseOrderId',
      label: 'Purchase Order',
      searchable: true,
      options: poOptions.map((po) => ({
        value: po.id,
        label: `${po.orderNumber}${po.supplier?.name ? ` — ${po.supplier.name}` : ''}`,
      })),
    },
    {
      key: 'grnId',
      label: 'GRN',
      searchable: true,
      options: grnOptions.map((grn) => ({
        value: grn.id,
        label: `${grn.receivingNumber}${grn.purchaseOrder?.orderNumber ? ` — ${grn.purchaseOrder.orderNumber}` : ''}`,
      })),
    },
    { type: 'daterange', label: 'Return Date', fromKey: 'startDate', toKey: 'endDate' },
  ]

  const columns: DataTableColumn<PurchaseReturn>[] = [
    {
      key: 'returnNumber',
      header: 'Return #',
      sortable: true,
      render: (ret) => <span className="font-medium text-gray-900">{ret.returnNumber}</span>,
    },
    {
      key: 'purchaseOrder',
      header: 'PO #',
      render: (ret) => <span className="text-gray-700">{ret.purchaseOrder?.orderNumber ?? '—'}</span>,
    },
    {
      key: 'supplier',
      header: 'Supplier',
      render: (ret) => (
        <span className="text-gray-700">
          {getReturnSupplier(ret)?.name ?? ret.purchaseOrder?.supplierName ?? '—'}
        </span>
      ),
    },
    {
      key: 'returnDate',
      header: 'Date',
      sortable: true,
      render: (ret) => (
        <span className="text-gray-700">{format(new Date(ret.returnDate), 'MMM dd, yyyy')}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (ret) => (
        <Badge className={STATUS_COLORS[ret.status] ?? 'bg-gray-100 text-gray-800'}>{ret.status}</Badge>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (ret) => <span className="text-gray-700 line-clamp-1">{ret.reason}</span>,
    },
    {
      key: 'totalAmount',
      header: 'Total',
      align: 'right',
      sortable: true,
      render: (ret) => (
        <span className="font-medium text-gray-900">{formatCurrency(Number(ret.totalAmount ?? 0))}</span>
      ),
    },
  ]

  const renderActions = (ret: PurchaseReturn) => (
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setSelectedReturn(ret)
          setShowDetails(true)
        }}
        className="h-8 w-8 p-0"
        title="View"
      >
        <Eye className="h-4 w-4" />
      </Button>
      {ret.status === 'DRAFT' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/dashboard/purchases/returns?id=${ret.id}`)}
          className="h-8 w-8 p-0 text-yellow-600"
          title="Edit"
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}
      {myPendingApproval(ret) && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openApprovalDialog(ret, 'APPROVED')}
            className="h-8 w-8 p-0 text-green-600"
            disabled={approveMutation.isPending}
            title="Approve"
          >
            <CheckCircle className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openApprovalDialog(ret, 'REJECTED')}
            className="h-8 w-8 p-0 text-red-600"
            disabled={approveMutation.isPending}
            title="Reject"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </>
      )}
      {allowedTransitions(ret.status).length > 0 && !myPendingApproval(ret) && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => openStatusDialog(ret)}
          className="h-8 w-8 p-0 text-blue-600"
          disabled={statusMutation.isPending}
          title="Update Status"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      )}
      {ret.status === 'DRAFT' && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleDelete(ret.id)}
          className="h-8 w-8 p-0 text-red-500"
          disabled={deleteMutation.isPending}
          title="Delete"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  )

  return (
    <ProtectedRoute>
      <ModuleListShell
        title="Purchase Returns"
        subtitle="Manage supplier returns against purchase orders and GRNs."
        action={
          <Button
            onClick={() => router.push('/dashboard/purchases/returns')}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="h-4 w-4 mr-2" /> New Return
          </Button>
        }
        statusTabs={{
          value: statusTabs.value,
          onChange: statusTabs.onChange,
          tabs: STATUS_TABS,
        }}
        headerExtra={
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Card className="border border-gray-200 shadow-sm">
              <CardContent className="p-3">
                <p className="text-xs text-gray-500">Total Returns</p>
                <p className="text-xl font-bold text-gray-900">{meta?.total ?? 0}</p>
              </CardContent>
            </Card>
          </div>
        }
      >
        <DataTable<PurchaseReturn>
          columns={columns}
          data={returns}
          meta={meta}
          controller={controller}
          rowKey={(ret) => ret.id}
          isLoading={isLoading}
          isError={isError}
          errorMessage="Failed to load purchase returns."
          searchable
          searchPlaceholder="Search returns…"
          filters={filters}
          pageSizeOptions
          emptyMessage="No purchase returns found."
          actions={renderActions}
        />
      </ModuleListShell>

      {/* Detail Modal */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Purchase Return Details</DialogTitle>
            <DialogDescription className="text-gray-500">
              Return #{selectedReturn?.returnNumber}
            </DialogDescription>
          </DialogHeader>
          {selectedReturn && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Return Information</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Return Number:</span>
                      <span className="text-gray-900">{selectedReturn.returnNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Order Number:</span>
                      <span className="text-gray-900">{selectedReturn.purchaseOrder?.orderNumber ?? '—'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Return Date:</span>
                      <span className="text-gray-900">
                        {format(new Date(selectedReturn.returnDate), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <Badge className={STATUS_COLORS[selectedReturn.status] ?? 'bg-gray-100 text-gray-800'}>
                        {selectedReturn.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Reason:</span>
                      <span className="text-gray-900">{selectedReturn.reason}</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Supplier</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Name:</span>
                      <span className="text-gray-900">
                        {getReturnSupplier(selectedReturn)?.name
                          ?? selectedReturn.purchaseOrder?.supplierName
                          ?? '—'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {selectedReturn.items && selectedReturn.items.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Return Items</h3>
                  <div className="rounded-md border border-gray-200 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow className="border-gray-200">
                          <TableHead className="text-gray-500">Raw Material</TableHead>
                          <TableHead className="text-gray-500">Code</TableHead>
                          <TableHead className="text-gray-500">Quantity</TableHead>
                          <TableHead className="text-gray-500">Unit Price</TableHead>
                          <TableHead className="text-gray-500">Reason</TableHead>
                          <TableHead className="text-gray-500">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedReturn.items.map((item) => (
                          <TableRow key={item.id} className="border-gray-200 hover:bg-gray-50">
                            <TableCell className="text-gray-900">{item.rawMaterial?.name ?? '—'}</TableCell>
                            <TableCell className="text-gray-700">{item.rawMaterial?.code ?? '—'}</TableCell>
                            <TableCell className="text-gray-700">{item.quantity}</TableCell>
                            <TableCell className="text-gray-700">
                              {formatCurrency(Number(item.unitPrice ?? 0))}
                            </TableCell>
                            <TableCell className="text-gray-700">{item.reason ?? '—'}</TableCell>
                            <TableCell className="text-gray-900 font-medium">
                              {formatCurrency(Number(item.totalPrice ?? 0))}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                <span className="text-2xl font-bold text-gray-900">
                  {formatCurrency(Number(selectedReturn.totalAmount ?? 0))}
                </span>
              </div>

              {selectedReturn.approvals && selectedReturn.approvals.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Approvals</h3>
                  <div className="space-y-1 text-sm">
                    {selectedReturn.approvals.map((a) => (
                      <div key={a.id} className="flex justify-between">
                        <span className="text-gray-700">
                          {a.approver?.name ?? a.approverId}
                          {currentUserId && a.approverId === currentUserId && (
                            <span className="ml-2 text-xs text-gray-400">(you)</span>
                          )}
                        </span>
                        <Badge className={STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-800'}>
                          {a.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end items-center gap-2">
                <ViewHistoryButton entityName="PurchaseReturn" entityId={selectedReturn.id} size="sm" />
                {myPendingApproval(selectedReturn) && (
                  <>
                    <Button
                      onClick={() => {
                        setShowDetails(false)
                        openApprovalDialog(selectedReturn, 'APPROVED')
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" /> Approve
                    </Button>
                    <Button
                      onClick={() => {
                        setShowDetails(false)
                        openApprovalDialog(selectedReturn, 'REJECTED')
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <XCircle className="h-4 w-4 mr-2" /> Reject
                    </Button>
                  </>
                )}
                {allowedTransitions(selectedReturn.status).length > 0 && !myPendingApproval(selectedReturn) && (
                  <Button
                    onClick={() => {
                      setShowDetails(false)
                      openStatusDialog(selectedReturn)
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" /> Update Status
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!statusDialogReturn} onOpenChange={(open) => { if (!open) setStatusDialogReturn(null) }}>
        <DialogContent className="max-w-md bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">Update Status</DialogTitle>
            <DialogDescription className="text-gray-500">
              Return #{statusDialogReturn?.returnNumber}
            </DialogDescription>
          </DialogHeader>
          {statusDialogReturn && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-gray-900">Decision</Label>
                <Select value={statusDecision} onValueChange={(v) => setStatusDecision(v as ReturnStatus)}>
                  <SelectTrigger className="bg-white border-gray-300 text-gray-900">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent position="popper" side="bottom" sideOffset={4} avoidCollisions={false}>
                    {allowedTransitions(statusDialogReturn.status).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-gray-900">
                  Remarks {statusDecision === 'REJECTED' ? '(recommended)' : '(optional)'}
                </Label>
                <Textarea
                  value={statusRemarks}
                  onChange={(e) => setStatusRemarks(e.target.value)}
                  placeholder="Reason / remarks for this status change…"
                  className="bg-white border-gray-300 text-gray-900"
                  rows={3}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogReturn(null)}>Cancel</Button>
            <Button
              onClick={submitStatusUpdate}
              disabled={!statusDecision || statusMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {statusMutation.isPending ? 'Updating…' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!approvalDialog} onOpenChange={(open) => { if (!open) setApprovalDialog(null) }}>
        <DialogContent className="max-w-md bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {approvalDialog?.decision === 'REJECTED' ? 'Reject Return' : 'Approve Return'}
            </DialogTitle>
            <DialogDescription className="text-gray-500">
              Return #{approvalDialog?.ret.returnNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-gray-900">
              Remarks {approvalDialog?.decision === 'REJECTED' ? '(recommended)' : '(optional)'}
            </Label>
            <Textarea
              value={approvalRemarks}
              onChange={(e) => setApprovalRemarks(e.target.value)}
              placeholder="Remarks for this decision…"
              className="bg-white border-gray-300 text-gray-900"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApprovalDialog(null)}>Cancel</Button>
            <Button
              onClick={submitApproval}
              disabled={approveMutation.isPending}
              className={
                approvalDialog?.decision === 'REJECTED'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }
            >
              {approveMutation.isPending
                ? 'Submitting…'
                : approvalDialog?.decision === 'REJECTED'
                  ? 'Reject'
                  : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  )
}
