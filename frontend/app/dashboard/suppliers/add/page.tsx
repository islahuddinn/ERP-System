'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { apiClient } from '@/lib/api-client'
import { ArrowLeft, Save } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useAuth } from '@/contexts/auth-context'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'react-hot-toast'

interface SupplierFormData {
  name: string
  contactPerson?: string
  email?: string
  phone?: string
  address?: string
  isActive: boolean
}

type OpeningBalanceTypeOption = 'RECEIVABLE' | 'PAYABLE'

interface OpeningBalanceFormState {
  enabled: boolean
  amount: string
  type: OpeningBalanceTypeOption
  date: string
  note: string
}

export default function AddSupplierPage() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const getDefaultOpeningBalanceState = (): OpeningBalanceFormState => ({
    enabled: false,
    amount: '',
    type: 'PAYABLE',
    date: new Date().toISOString().split('T')[0],
    note: '',
  })
  const [openingBalanceForm, setOpeningBalanceForm] = useState<OpeningBalanceFormState>(getDefaultOpeningBalanceState())

  // Create supplier mutation
  type SupplierPayload = SupplierFormData & {
    openingBalance?: {
      amount: number | null
      type: OpeningBalanceTypeOption
      date?: string
      note?: string
    }
  }

  const createMutation = useMutation({
    mutationFn: async (data: SupplierPayload) => {
      console.log('➕ Creating supplier:', data)
      try {
        const response = await apiClient.post('/suppliers', data)
        console.log('✅ Supplier created successfully:', response.data)
        return response.data
      } catch (error: any) {
        console.error('❌ Error creating supplier:', error)
        
        // Extract user-friendly error message
        let errorMessage = 'An unexpected error occurred. Please try again.'
        
        if (error.response?.status === 409) {
          errorMessage = 'A supplier with this name already exists. Please choose a different name.'
        } else if (error.response?.status === 400) {
          const backendMessage = error.response.data?.message || ''
          if (backendMessage.includes('name') && backendMessage.includes('required')) {
            errorMessage = 'Supplier name is required. Please enter a supplier name.'
          } else if (backendMessage.includes('email') && backendMessage.includes('invalid')) {
            errorMessage = 'Please enter a valid email address.'
          } else if (backendMessage.includes('phone') && backendMessage.includes('invalid')) {
            errorMessage = 'Please enter a valid phone number.'
          } else {
            errorMessage = backendMessage || 'Please check your input and try again.'
          }
        } else if (error.response?.status === 401) {
          errorMessage = 'You are not authorized to perform this action. Please log in again.'
        } else if (error.response?.status === 403) {
          errorMessage = 'You do not have permission to create suppliers. Please contact your administrator.'
        } else if (error.response?.status === 500) {
          errorMessage = 'Server error occurred. Please try again later or contact support if the problem persists.'
        } else if (error.code === 'NETWORK_ERROR' || !error.response) {
          errorMessage = 'Network error. Please check your internet connection and try again.'
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message
        }
        
        // Create a new error with the user-friendly message
        const friendlyError = new Error(errorMessage)
        friendlyError.name = error.name
        throw friendlyError
      }
    },
    onSuccess: () => {
      console.log('🔄 Invalidating queries after supplier creation')
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      toast.success('Supplier created successfully!')
      setTimeout(() => {
        router.push('/dashboard/suppliers')
      }, 1000)
    },
    onError: (error: any) => {
      console.error('❌ Error creating supplier:', error)
      toast.error(error.message || 'Failed to create supplier. Please try again.')
    },
  })

  // Form handling
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<SupplierFormData>({
    defaultValues: {
      name: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      isActive: true,
    }
  })

  const onSubmit = (data: SupplierFormData) => {
    const cleanedData: SupplierPayload = {
      ...data,
      contactPerson: data.contactPerson?.trim() || undefined,
      email: data.email?.trim() || undefined,
      phone: data.phone?.trim() || undefined,
      address: data.address?.trim() || undefined,
    }

    // Only include openingBalance if enabled and has valid amount
    if (openingBalanceForm.enabled) {
      const amount = parseFloat(openingBalanceForm.amount)
      if (!isNaN(amount) && amount >= 0) {
        cleanedData.openingBalance = {
          amount,
          type: openingBalanceForm.type,
          date: openingBalanceForm.date || undefined,
          note: openingBalanceForm.note?.trim() || undefined,
        }
      }
    }
    // If opening balance is not enabled, don't include it in the payload at all

    createMutation.mutate(cleanedData)
  }

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
    return null
  }

  return (
    <div className="container mx-auto py-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            onClick={() => router.back()}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-white">Add New Supplier</h1>
            <p className="mt-1 text-sm text-gray-400">
              Create a new supplier in your system
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-2xl">
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Supplier Information</CardTitle>
            <CardDescription className="text-gray-400">
              Fill in the details to create a new supplier
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div>
                <Label htmlFor="name" className="text-gray-300">Supplier Name *</Label>
                <Input
                  id="name"
                  {...register('name', { required: 'Supplier name is required' })}
                  placeholder="Enter supplier name"
                  className="bg-gray-700 border-gray-600 text-white"
                />
                {errors.name && (
                  <p className="text-sm text-red-400 mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="contactPerson" className="text-gray-300">Contact Person</Label>
                <Input
                  id="contactPerson"
                  {...register('contactPerson')}
                  placeholder="Enter contact person name"
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="email" className="text-gray-300">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email', {
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Please enter a valid email address'
                      }
                    })}
                    placeholder="Enter email address"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  {errors.email && (
                    <p className="text-sm text-red-400 mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone" className="text-gray-300">Phone</Label>
                  <Input
                    id="phone"
                    {...register('phone')}
                    placeholder="Enter phone number"
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <Label htmlFor="address" className="text-gray-300">Address</Label>
                <textarea
                  id="address"
                  {...register('address')}
                  placeholder="Enter address"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              {/* Status */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isActive"
                  checked={watch('isActive') ?? true}
                  onCheckedChange={(checked) => setValue('isActive', checked === true)}
                />
                <Label htmlFor="isActive" className="text-gray-300 font-normal cursor-pointer">Active</Label>
              </div>

              <div className="space-y-4 rounded-lg border border-dashed border-gray-600 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold text-gray-300">Opening Balance</Label>
                    <p className="text-sm text-gray-400">Optional starting balance for this supplier.</p>
                  </div>
                  <Checkbox
                    checked={openingBalanceForm.enabled}
                    onCheckedChange={(checked) =>
                      setOpeningBalanceForm((prev) => ({ ...prev, enabled: checked === true }))
                    }
                  />
                </div>
                {openingBalanceForm.enabled && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="opening-amount" className="text-gray-300">Amount</Label>
                      <Input
                        id="opening-amount"
                        type="number"
                        min="0"
                        step="0.01"
                        value={openingBalanceForm.amount}
                        onChange={(e) =>
                          setOpeningBalanceForm((prev) => ({ ...prev, amount: e.target.value }))
                        }
                        placeholder="0.00"
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="opening-type" className="text-gray-300">Type</Label>
                      <Select
                        value={openingBalanceForm.type}
                        onValueChange={(value: OpeningBalanceTypeOption) =>
                          setOpeningBalanceForm((prev) => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger id="opening-type" className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-700">
                          <SelectItem value="PAYABLE" className="text-white">Payable (you owe supplier)</SelectItem>
                          <SelectItem value="RECEIVABLE" className="text-white">Receivable (supplier owes you)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="opening-date" className="text-gray-300">As of Date</Label>
                      <Input
                        id="opening-date"
                        type="date"
                        value={openingBalanceForm.date}
                        onChange={(e) =>
                          setOpeningBalanceForm((prev) => ({ ...prev, date: e.target.value }))
                        }
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                    <div>
                      <Label htmlFor="opening-note" className="text-gray-300">Note</Label>
                      <Input
                        id="opening-note"
                        value={openingBalanceForm.note}
                        onChange={(e) =>
                          setOpeningBalanceForm((prev) => ({ ...prev, note: e.target.value }))
                        }
                        placeholder="Imported from legacy system..."
                        className="bg-gray-700 border-gray-600 text-white"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {createMutation.isPending ? 'Creating...' : 'Create Supplier'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
