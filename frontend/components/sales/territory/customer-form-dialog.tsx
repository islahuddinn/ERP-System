'use client'

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { CustomerForm } from '@/components/customers/customer-form'
import type { Customer } from '@/hooks/useCustomers'

interface CustomerFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customer?: Customer | null
  /** Pre-selected area when creating from a drilled-in area context. */
  defaultAreaId?: string
}

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
  defaultAreaId,
}: CustomerFormDialogProps) {
  const isEdit = Boolean(customer)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update this shop customer.' : 'Register a shop under an area in the sales territory.'}
          </DialogDescription>
        </DialogHeader>

        <CustomerForm
          active={open}
          customer={customer}
          defaultAreaId={defaultAreaId}
          layout="embedded"
          onSuccess={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}
