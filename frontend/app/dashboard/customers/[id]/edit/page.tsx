'use client'

import { useRouter, useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { CustomerForm } from '@/components/customers/customer-form'
import { useCustomer } from '@/hooks/useCustomers'

export default function EditCustomerPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const customerId = params.id
  const { data: customer, isLoading, isError } = useCustomer(customerId)

  return (
    <ProtectedRoute requiredPermission="customers.update">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push(`/dashboard/customers/${customerId}`)}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="h-8 w-8 text-green-600" />
              Edit Customer
            </h1>
            <p className="text-gray-600 mt-1">
              {customer ? `Update details for ${customer.shopName}.` : 'Update customer information.'}
            </p>
          </div>
        </div>

        <Card className="bg-white border-gray-200 shadow-sm max-w-3xl">
          <CardHeader>
            <CardTitle className="text-gray-900">Customer Details</CardTitle>
            <CardDescription>Update shop information and territory assignment.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading && (
              <div className="flex items-center justify-center py-12 text-gray-500">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading customer…
              </div>
            )}
            {isError && (
              <p className="text-sm text-red-600 py-8 text-center">Failed to load customer. Please try again.</p>
            )}
            {!isLoading && !isError && customer && (
              <CustomerForm
                customer={customer}
                layout="page"
                onSuccess={() => router.push(`/dashboard/customers/${customerId}`)}
                onCancel={() => router.push(`/dashboard/customers/${customerId}`)}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
