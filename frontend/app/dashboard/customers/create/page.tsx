'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { CustomerForm } from '@/components/customers/customer-form'

export default function CreateCustomerPage() {
  const router = useRouter()

  return (
    <ProtectedRoute requiredPermission="customers.create">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/customers')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Users className="h-8 w-8 text-green-600" />
              Add Customer
            </h1>
            <p className="text-gray-600 mt-1">Register a new shop customer in the sales territory.</p>
          </div>
        </div>

        <Card className="bg-white border-gray-200 shadow-sm max-w-3xl">
          <CardHeader>
            <CardTitle className="text-gray-900">Customer Details</CardTitle>
            <CardDescription>
              Enter shop information and assign the customer to an area in the territory hierarchy.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CustomerForm
              layout="page"
              onSuccess={() => router.push('/dashboard/customers')}
              onCancel={() => router.push('/dashboard/customers')}
            />
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
