'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useOrgUnit, useOrgUnits, useUpdateOrgUnit, ORG_UNIT_TYPES, type OrgUnitType } from '@/hooks/useOrgUnits'
import { getApiErrorMessage } from '@/lib/api-error'
import { ArrowLeft, Loader2, Save, Network } from 'lucide-react'

interface OrgUnitFormData {
  name: string
  type: OrgUnitType | ''
  parentId: string
}

export default function EditOrgUnitPage() {
  const router = useRouter()
  const params = useParams()
  const orgUnitId = params?.id as string

  // Prefer by-id; fall back to the list cache while it loads so edit works instantly.
  const { data: unitById, isLoading: isLoadingById } = useOrgUnit(orgUnitId)
  const { data: unitList = [], isLoading: isLoadingList } = useOrgUnits()
  const orgUnit = unitById ?? unitList.find((u) => u.id === orgUnitId)
  const updateMutation = useUpdateOrgUnit()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<OrgUnitFormData>({
    defaultValues: { name: '', type: '', parentId: '' },
  })

  useEffect(() => {
    if (orgUnit) {
      reset({
        name: orgUnit.name || '',
        type: orgUnit.type || '',
        parentId: orgUnit.parentId || '',
      })
    }
  }, [orgUnit, reset])

  const onSubmit = async (data: OrgUnitFormData) => {
    if (!data.type) {
      toast.error('Type is required')
      return
    }
    try {
      await updateMutation.mutateAsync({
        id: orgUnitId,
        payload: {
          name: data.name.trim(),
          type: data.type,
          parentId: data.parentId || null,
        },
      })
      router.push('/dashboard/hr/org-units')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update org unit'))
    }
  }

  const isLoading = updateMutation.isPending
  const isResolving = isLoadingById && isLoadingList && !orgUnit

  // A unit cannot be its own parent — exclude it from the parent options.
  const selectableParents = unitList.filter((u) => u.id !== orgUnitId)

  if (isResolving) {
    return (
      <ProtectedRoute requiredPermission="hr.manage_employees">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!orgUnit) {
    return (
      <ProtectedRoute requiredPermission="hr.manage_employees">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-red-500">
          <p>Org unit not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/hr/org-units')} className="mt-4">Back to Org Units</Button>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="hr.manage_employees">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/dashboard/hr/org-units')} className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <Network className="h-8 w-8 text-green-600" />
              Edit Org Unit
            </h1>
            <p className="text-gray-600 mt-1">Update unit name, type or parent.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Org Unit Details</CardTitle>
              <CardDescription>Update the org unit information.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-gray-700 font-medium">Name <span className="text-red-500">*</span></Label>
                <Input id="name" {...register('name', { required: 'Name is required', validate: (v) => v.trim().length > 0 || 'Name is required', maxLength: { value: 128, message: 'Max 128 characters' } })} className="mt-1.5 h-11 border-gray-300" />
                {errors.name && <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <Label htmlFor="type" className="text-gray-700 font-medium">Type <span className="text-red-500">*</span></Label>
                <Controller
                  control={control}
                  name="type"
                  rules={{ required: 'Type is required' }}
                  render={({ field }) => (
                    // key forces remount once the unit loads so the saved type shows.
                    <Select key={orgUnit.id} value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger id="type" className="mt-1.5 h-11 border-gray-300"><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>{ORG_UNIT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                />
                {errors.type && <p className="text-sm text-red-600 mt-1">{errors.type.message}</p>}
              </div>

              <div>
                <Label htmlFor="parentId" className="text-gray-700 font-medium">Parent Org Unit</Label>
                <Controller
                  control={control}
                  name="parentId"
                  render={({ field }) => (
                    <Select key={orgUnit.id} value={field.value || undefined} onValueChange={field.onChange}>
                      <SelectTrigger id="parentId" className="mt-1.5 h-11 border-gray-300"><SelectValue placeholder="Select parent (optional)" /></SelectTrigger>
                      <SelectContent>{selectableParents.map((u) => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}</SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to make this a top-level unit.</p>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => router.push('/dashboard/hr/org-units')} disabled={isLoading} className="border-gray-300 text-gray-700 hover:bg-gray-50">Cancel</Button>
            <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]">
              {isLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : <><Save className="mr-2 h-4 w-4" />Save Changes</>}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
