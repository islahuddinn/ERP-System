'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useCreatePlant, type CreatePlantDto } from '@/hooks/usePlants'
import { ArrowLeft, Loader2, Factory, Save } from 'lucide-react'
import { apiClient } from '@/lib/api-client'

interface PlantFormData {
  name: string
  code: string
  locationId: string
  plantType: 'MANUFACTURING' | 'ASSEMBLY' | 'PACKAGING' | 'WAREHOUSE' | 'QUALITY_CONTROL' | 'RESEARCH_DEVELOPMENT' | 'ADMINISTRATION' | 'MIXED'
  capacity: 'SMALL' | 'MEDIUM' | 'LARGE' | 'EXTRA_LARGE'
  address: string
  managerId?: string
  description?: string
  contactPhone?: string
  contactEmail?: string
  contactPerson?: string
  operatingHours?: string
}

export default function CreatePlantPage() {
  const router = useRouter()
  const createMutation = useCreatePlant()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PlantFormData>({
    defaultValues: {
      name: '',
      code: '',
      locationId: '',
      plantType: 'MANUFACTURING',
      capacity: 'MEDIUM',
      address: '',
      managerId: undefined,
      description: '',
      contactPhone: '',
      contactEmail: '',
      contactPerson: '',
      operatingHours: '',
    },
  })

  // Fetch locations from API
  const { data: locationsData } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      const response = await apiClient.get('/locations')
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
  const locations: Array<{ id: string; name: string; address?: string }> = Array.isArray(locationsData?.data) 
    ? locationsData.data 
    : Array.isArray(locationsData?.data?.data)
    ? locationsData.data.data
    : Array.isArray(locationsData)
    ? locationsData
    : []

  // Fetch users from API
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
  const users: Array<{ id: string; name: string; email: string }> = Array.isArray(usersData?.data) 
    ? usersData.data 
    : Array.isArray(usersData?.data?.data)
    ? usersData.data.data
    : Array.isArray(usersData)
    ? usersData
    : []

  const onSubmit = async (data: PlantFormData) => {
    try {
      // Build plant data object, only including fields with actual values
      const plantData: CreatePlantDto = {
        name: data.name.trim(),
        code: data.code.trim(),
        locationId: data.locationId,
        plantType: data.plantType,
        capacity: data.capacity,
        address: data.address.trim(),
      }

      // Only add optional fields if they have values
      if (data.managerId && data.managerId !== 'none') {
        plantData.managerId = data.managerId
      }

      const description = data.description?.trim()
      if (description) {
        plantData.description = description
      }

      const contactPhone = data.contactPhone?.trim()
      if (contactPhone) {
        plantData.contactPhone = contactPhone
      }

      const contactEmail = data.contactEmail?.trim()
      if (contactEmail) {
        plantData.contactEmail = contactEmail
      }

      const contactPerson = data.contactPerson?.trim()
      if (contactPerson) {
        plantData.contactPerson = contactPerson
      }

      const operatingHours = data.operatingHours?.trim()
      if (operatingHours) {
        plantData.operatingHours = operatingHours
      }

      await createMutation.mutateAsync(plantData)
      toast.success('Plant created successfully')
      router.push('/dashboard/plants')
    } catch (error: any) {
      console.error('Error creating plant:', error)
      toast.error(error.response?.data?.message || 'Failed to create plant')
    }
  }

  const isLoading = createMutation.isPending

  return (
    <ProtectedRoute requiredPermission="plants.create">
      <div className="factory-section">
        <div className="factory-page-container">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard/plants')}
                className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <Factory className="h-8 w-8 text-green-600" />
                  Create Plant
                </h1>
                <p className="text-gray-600 mt-1">Add a new production plant to the system</p>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column */}
                <div className="space-y-6">
                  {/* Basic Information */}
                  <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-gray-900">Basic Information</CardTitle>
                      <CardDescription>Enter the basic details of the plant</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="name" className="text-gray-700 font-medium">
                          Plant Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="name"
                          {...register('name', { 
                            required: 'Plant name is required',
                            minLength: {
                              value: 2,
                              message: 'Plant name must be at least 2 characters',
                            },
                          })}
                          placeholder="e.g., Main Production Plant"
                          className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                        {errors.name && (
                          <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="code" className="text-gray-700 font-medium">
                          Plant Code <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="code"
                          {...register('code', { 
                            required: 'Plant code is required',
                            pattern: {
                              value: /^[A-Z0-9-]+$/,
                              message: 'Code must contain only uppercase letters, numbers, and hyphens',
                            },
                          })}
                          placeholder="e.g., PLANT-001"
                          className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono"
                        />
                        {errors.code && (
                          <p className="text-sm text-red-600 mt-1">{errors.code.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="locationId" className="text-gray-700 font-medium">
                          Location <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={watch('locationId') || ''}
                          onValueChange={(value) => setValue('locationId', value, { shouldValidate: true })}
                        >
                          <SelectTrigger className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                            <SelectValue placeholder="Select location" />
                          </SelectTrigger>
                          <SelectContent>
                            {locations.map((location: { id: string; name: string; address?: string }) => (
                              <SelectItem key={location.id} value={location.id}>
                                {location.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.locationId && (
                          <p className="text-sm text-red-600 mt-1">{errors.locationId.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="plantType" className="text-gray-700 font-medium">
                          Plant Type <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={watch('plantType') || 'MANUFACTURING'}
                          onValueChange={(value) => {
                            setValue('plantType', value as PlantFormData['plantType'], { shouldValidate: true })
                          }}
                        >
                          <SelectTrigger className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                            <SelectValue placeholder="Select plant type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MANUFACTURING">Manufacturing</SelectItem>
                            <SelectItem value="ASSEMBLY">Assembly</SelectItem>
                            <SelectItem value="PACKAGING">Packaging</SelectItem>
                            <SelectItem value="WAREHOUSE">Warehouse</SelectItem>
                            <SelectItem value="QUALITY_CONTROL">Quality Control</SelectItem>
                            <SelectItem value="RESEARCH_DEVELOPMENT">Research & Development</SelectItem>
                            <SelectItem value="ADMINISTRATION">Administration</SelectItem>
                            <SelectItem value="MIXED">Mixed</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.plantType && (
                          <p className="text-sm text-red-600 mt-1">{errors.plantType.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="capacity" className="text-gray-700 font-medium">
                          Capacity <span className="text-red-500">*</span>
                        </Label>
                        <Select
                          value={watch('capacity') || 'MEDIUM'}
                          onValueChange={(value) => {
                            setValue('capacity', value as PlantFormData['capacity'], { shouldValidate: true })
                          }}
                        >
                          <SelectTrigger className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                            <SelectValue placeholder="Select capacity" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SMALL">Small</SelectItem>
                            <SelectItem value="MEDIUM">Medium</SelectItem>
                            <SelectItem value="LARGE">Large</SelectItem>
                            <SelectItem value="EXTRA_LARGE">Extra Large</SelectItem>
                          </SelectContent>
                        </Select>
                        {errors.capacity && (
                          <p className="text-sm text-red-600 mt-1">{errors.capacity.message}</p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor="address" className="text-gray-700 font-medium">
                          Address <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="address"
                          {...register('address', { 
                            required: 'Address is required',
                            minLength: {
                              value: 5,
                              message: 'Address must be at least 5 characters',
                            },
                          })}
                          placeholder="e.g., 123 Factory Street, City, State"
                          className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                        {errors.address && (
                          <p className="text-sm text-red-600 mt-1">{errors.address.message}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Manager Assignment */}
                  <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-gray-900">Manager Assignment</CardTitle>
                      <CardDescription>Assign a manager to this plant (optional)</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div>
                        <Label htmlFor="managerId" className="text-gray-700 font-medium">
                          Manager
                        </Label>
                        <Select
                          value={watch('managerId') || 'none'}
                          onValueChange={(value) => setValue('managerId', value === 'none' ? undefined : value, { shouldValidate: true })}
                        >
                          <SelectTrigger className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500">
                            <SelectValue placeholder="Select manager" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No Manager</SelectItem>
                            {Array.isArray(users) && users.map((user: { id: string; name: string; email: string }) => (
                              <SelectItem key={user.id} value={user.id}>
                                {user.name} ({user.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  {/* Additional Information */}
                  <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-gray-900">Additional Information</CardTitle>
                      <CardDescription>Provide additional details about the plant</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="description" className="text-gray-700 font-medium">
                          Description
                        </Label>
                        <Textarea
                          id="description"
                          {...register('description')}
                          placeholder="Enter plant description, facilities, or any additional notes..."
                          rows={4}
                          className="mt-1.5 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>

                      <div>
                        <Label htmlFor="contactPerson" className="text-gray-700 font-medium">
                          Contact Person
                        </Label>
                        <Input
                          id="contactPerson"
                          {...register('contactPerson')}
                          placeholder="e.g., John Doe"
                          className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>

                      <div>
                        <Label htmlFor="contactPhone" className="text-gray-700 font-medium">
                          Contact Phone
                        </Label>
                        <Input
                          id="contactPhone"
                          {...register('contactPhone')}
                          placeholder="e.g., 555-123-4567"
                          className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>

                      <div>
                        <Label htmlFor="contactEmail" className="text-gray-700 font-medium">
                          Contact Email
                        </Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          {...register('contactEmail')}
                          placeholder="e.g., plant.manager@company.com"
                          className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>

                      <div>
                        <Label htmlFor="operatingHours" className="text-gray-700 font-medium">
                          Operating Hours
                        </Label>
                        <Input
                          id="operatingHours"
                          {...register('operatingHours')}
                          placeholder="e.g., 9:00 AM - 5:00 PM"
                          className="mt-1.5 h-11 border-gray-300 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Summary Card */}
                  <Card className="bg-green-50 border border-green-200 shadow-sm">
                    <CardHeader>
                      <CardTitle className="text-gray-900">Summary</CardTitle>
                      <CardDescription>Review the information before creating</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Plant Name:</span>
                        <span className="font-medium text-gray-900">{watch('name') || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Plant Code:</span>
                        <span className="font-medium text-gray-900 font-mono">{watch('code') || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Location:</span>
                        <span className="font-medium text-gray-900">
                          {locations.find((l: { id: string; name: string; address?: string }) => l.id === watch('locationId'))?.name || 'Not selected'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Plant Type:</span>
                        <span className="font-medium text-gray-900">{watch('plantType') || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Capacity:</span>
                        <span className="font-medium text-gray-900">{watch('capacity') || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Address:</span>
                        <span className="font-medium text-gray-900">{watch('address') || 'Not set'}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Manager:</span>
                        <span className="font-medium text-gray-900">
                          {watch('managerId') && watch('managerId') !== 'none'
                            ? users.find(u => u.id === watch('managerId'))?.name || 'Not found'
                            : 'Not assigned'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/dashboard/plants')}
                  disabled={isLoading}
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Create Plant
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
