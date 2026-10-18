'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Loader2, Save } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { getApiErrorMessage } from '@/lib/api-error'
import {
  useCreateTransporter,
  useUpdateTransporter,
  type Transporter,
  type TransporterStatus,
} from '@/hooks/useTransporters'

interface TransporterFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transporter?: Transporter | null
}

interface TransporterFormData {
  code: string
  name: string
  contactName: string
  phone: string
  email: string
  address: string
  vehicleRegistration: string
  notes: string
  status: TransporterStatus
}

export function TransporterFormDialog({
  open,
  onOpenChange,
  transporter,
}: TransporterFormDialogProps) {
  const isEdit = Boolean(transporter)
  const createMutation = useCreateTransporter()
  const updateMutation = useUpdateTransporter()
  const [isHydrated, setIsHydrated] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, dirtyFields },
  } = useForm<TransporterFormData>({
    defaultValues: {
      code: '',
      name: '',
      contactName: '',
      phone: '',
      email: '',
      address: '',
      vehicleRegistration: '',
      notes: '',
      status: 'ACTIVE',
    },
  })

  useEffect(() => {
    if (open) {
      reset({
        code: transporter?.code ?? '',
        name: transporter?.name ?? '',
        contactName: transporter?.contactName ?? '',
        phone: transporter?.phone ?? '',
        email: transporter?.email ?? '',
        address: transporter?.address ?? '',
        vehicleRegistration: transporter?.vehicleRegistration ?? '',
        notes: transporter?.notes ?? '',
        status: transporter?.status ?? 'ACTIVE',
      })
      setIsHydrated(true)
    } else {
      setIsHydrated(false)
    }
  }, [open, transporter, reset])

  const onSubmit = async (data: TransporterFormData) => {
    try {
      const payload = {
        code: data.code.trim(),
        name: data.name.trim(),
        contactName: data.contactName.trim() || undefined,
        phone: data.phone.trim() || undefined,
        email: data.email.trim() || undefined,
        address: data.address.trim() || undefined,
        vehicleRegistration: data.vehicleRegistration.trim() || undefined,
        notes: data.notes.trim() || undefined,
        status: data.status,
      }

      if (isEdit && transporter) {
        const updatePayload: Partial<TransporterFormData> = {}
        if (dirtyFields.code) updatePayload.code = payload.code
        if (dirtyFields.name) updatePayload.name = payload.name
        if (dirtyFields.contactName) updatePayload.contactName = payload.contactName
        if (dirtyFields.phone) updatePayload.phone = payload.phone
        if (dirtyFields.email) updatePayload.email = payload.email
        if (dirtyFields.address) updatePayload.address = payload.address
        if (dirtyFields.vehicleRegistration) updatePayload.vehicleRegistration = payload.vehicleRegistration
        if (dirtyFields.notes) updatePayload.notes = payload.notes
        if (dirtyFields.status) updatePayload.status = payload.status

        await updateMutation.mutateAsync({
          transporterId: transporter.id,
          data: updatePayload,
        })
      } else {
        await createMutation.mutateAsync(payload)
      }

      onOpenChange(false)
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, isEdit ? 'Failed to update transporter' : 'Failed to create transporter'),
      )
    }
  }

  const isLoading = createMutation.isPending || updateMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Transporter' : 'Add Transporter'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update transporter contact and vehicle details.'
              : 'Register a logistics vendor for future delivery and payment workflows.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="transporter-code" className="text-gray-700 font-medium">
                Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="transporter-code"
                {...register('code', {
                  required: 'Code is required',
                  validate: (value) => value.trim().length > 0 || 'Code is required',
                  maxLength: { value: 32, message: 'Code must be 32 characters or fewer' },
                })}
                placeholder="e.g. TR-001"
                className="mt-1.5 h-11 border-gray-300"
              />
              {errors.code && <p className="text-sm text-red-600 mt-1">{errors.code.message}</p>}
            </div>

            <div>
              <Label htmlFor="transporter-name" className="text-gray-700 font-medium">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="transporter-name"
                {...register('name', {
                  required: 'Name is required',
                  validate: (value) => value.trim().length > 0 || 'Name is required',
                  maxLength: { value: 128, message: 'Name must be 128 characters or fewer' },
                })}
                placeholder="e.g. FastMove Logistics"
                className="mt-1.5 h-11 border-gray-300"
              />
              {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="transporter-contact" className="text-gray-700 font-medium">
                Contact Person
              </Label>
              <Input
                id="transporter-contact"
                {...register('contactName', {
                  maxLength: { value: 128, message: 'Contact name must be 128 characters or fewer' },
                })}
                placeholder="e.g. Ahmed Khan"
                className="mt-1.5 h-11 border-gray-300"
              />
            </div>

            <div>
              <Label htmlFor="transporter-phone" className="text-gray-700 font-medium">
                Phone
              </Label>
              <Input
                id="transporter-phone"
                {...register('phone')}
                placeholder="e.g. +92-300-1234567"
                className="mt-1.5 h-11 border-gray-300"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="transporter-email" className="text-gray-700 font-medium">
                Email
              </Label>
              <Input
                id="transporter-email"
                type="email"
                {...register('email')}
                placeholder="e.g. dispatch@fastmove.com"
                className="mt-1.5 h-11 border-gray-300"
              />
            </div>

            <div>
              <Label htmlFor="transporter-vehicle" className="text-gray-700 font-medium">
                Vehicle Registration
              </Label>
              <Input
                id="transporter-vehicle"
                {...register('vehicleRegistration', {
                  maxLength: { value: 32, message: 'Vehicle registration must be 32 characters or fewer' },
                })}
                placeholder="e.g. LEA-1234"
                className="mt-1.5 h-11 border-gray-300"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="transporter-address" className="text-gray-700 font-medium">
              Address
            </Label>
            <Textarea
              id="transporter-address"
              {...register('address', {
                maxLength: { value: 512, message: 'Address must be 512 characters or fewer' },
              })}
              placeholder="Office or depot address"
              className="mt-1.5 min-h-[72px] border-gray-300"
            />
          </div>

          <div>
            <Label htmlFor="transporter-notes" className="text-gray-700 font-medium">
              Notes
            </Label>
            <Textarea
              id="transporter-notes"
              {...register('notes', {
                maxLength: { value: 512, message: 'Notes must be 512 characters or fewer' },
              })}
              placeholder="Optional internal notes"
              className="mt-1.5 min-h-[72px] border-gray-300"
            />
          </div>

          <div>
            <Label htmlFor="transporter-status" className="text-gray-700 font-medium">
              Status
            </Label>
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  key={`status-${isHydrated ? 'ready' : 'loading'}`}
                  value={field.value}
                  onValueChange={field.onChange}
                >
                  <SelectTrigger id="transporter-status" className="mt-1.5 h-11 border-gray-300">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <DialogFooter className="gap-2 sm:justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white min-w-[110px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
