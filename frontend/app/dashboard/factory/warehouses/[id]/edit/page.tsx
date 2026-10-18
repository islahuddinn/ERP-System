'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useWarehouse } from '@/hooks/useWarehouses'
import { apiClient } from '@/lib/api-client'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { CreateWarehouseModal } from '@/components/factory/warehouses'

interface Location {
  id: string
  name: string
}

interface User {
  id: string
  name: string
  email: string
}

export default function EditWarehousePage() {
  const params = useParams()
  const router = useRouter()
  const warehouseId = params.id as string
  const [isModalOpen, setIsModalOpen] = useState(true)

  // Fetch warehouse data
  const { data: warehouse, isLoading: warehouseLoading } = useWarehouse(warehouseId)

  // Fetch locations for dropdown
  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await apiClient.get('/locations')
      return response.data?.data || response.data || []
    },
  })
  const locations = (locationsData || []) as Location[]

  // Fetch users for manager dropdown
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await apiClient.get('/users?limit=100')
      const responseData = response.data
      // Handle wrapped response from ResponseInterceptor
      if (responseData && typeof responseData === 'object' && 'data' in responseData && !Array.isArray(responseData.data)) {
        return responseData.data
      }
      return responseData
    },
  })
  // Handle wrapped response: { success, message, data: { data: [...], meta: {...} } }
  // Or direct response: { data: [...], meta: {...} }
  const users: User[] = Array.isArray(usersData?.data) 
    ? usersData.data 
    : Array.isArray(usersData?.data?.data)
    ? usersData.data.data
    : Array.isArray(usersData)
    ? usersData
    : []

  const handleClose = () => {
    router.push(`/dashboard/factory/warehouses/${warehouseId}`)
  }

  if (warehouseLoading) {
    return (
      <ProtectedRoute requiredPermission="warehouses.update">
        <div className="factory-section">
          <div className="factory-page-container">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  if (!warehouse) {
    return (
      <ProtectedRoute requiredPermission="warehouses.update">
        <div className="factory-section">
          <div className="factory-page-container">
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardContent className="text-center py-16">
                <p className="text-gray-900 font-semibold text-lg mb-2">Warehouse not found</p>
                <Button
                  onClick={() => router.push('/dashboard/factory/warehouses')}
                  className="bg-green-600 hover:bg-green-700 text-white mt-4"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Warehouses
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="warehouses.update">
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push(`/dashboard/factory/warehouses/${warehouseId}`)}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Edit Warehouse</h1>
                <p className="text-gray-600 mt-1">Update warehouse information</p>
              </div>
            </div>

            {/* Edit Modal */}
            <CreateWarehouseModal
              isOpen={isModalOpen}
              onClose={handleClose}
              warehouse={warehouse}
              locations={locations}
              users={users}
            />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

