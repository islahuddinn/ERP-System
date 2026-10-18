'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { useContract, useUpdateContract } from '@/hooks/useContracts'
import { useDepartmentsDropdown } from '@/hooks/useDepartments'
import { usePositionsDropdown } from '@/hooks/usePositions'
import { getApiErrorMessage } from '@/lib/api-error'
import { ArrowLeft, Loader2, Save, FileSignature } from 'lucide-react'

const NO_VALUE = '__none__'

interface ContractEditFormData {
  departmentId: string
  positionId: string
  startDate: string
  endDate: string
  probationEndDate: string
  totalLeaves: number
  notes: string
}

export default function EditContractPage() {
  const router = useRouter()
  const params = useParams()
  const contractId = params?.id as string

  const { data: contract, isLoading: isLoadingContract } = useContract(contractId)
  const { data: departments = [], isLoading: isLoadingDepartments } = useDepartmentsDropdown()
  const { data: positions = [], isLoading: isLoadingPositions } = usePositionsDropdown()
  const updateMutation = useUpdateContract()

  // Tracks whether reset() below has actually applied the fetched contract's
  // values to the form yet. The Department/Position Selects key off this so they
  // remount exactly once real data lands — Radix Select only picks up a
  // programmatic value change on mount, so without the remount they keep showing
  // the placeholder instead of the saved department/position (#23).
  const [isHydrated, setIsHydrated] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ContractEditFormData>({
    defaultValues: {
      departmentId: NO_VALUE,
      positionId: NO_VALUE,
      startDate: '',
      endDate: '',
      probationEndDate: '',
      totalLeaves: 15,
      notes: '',
    },
  })

  useEffect(() => {
    if (contract) {
      reset({
        departmentId: contract.departmentId || NO_VALUE,
        positionId: contract.positionId || NO_VALUE,
        startDate: contract.startDate ? contract.startDate.slice(0, 10) : '',
        endDate: contract.endDate ? contract.endDate.slice(0, 10) : '',
        probationEndDate: contract.probationEndDate ? contract.probationEndDate.slice(0, 10) : '',
        totalLeaves: Number(contract.totalLeaves),
        notes: contract.notes || '',
      })
      setIsHydrated(true)
    }
  }, [contract, reset])

  const onSubmit = async (data: ContractEditFormData) => {
    try {
      await updateMutation.mutateAsync({
        id: contractId,
        data: {
          departmentId: data.departmentId && data.departmentId !== NO_VALUE ? data.departmentId : null,
          positionId: data.positionId && data.positionId !== NO_VALUE ? data.positionId : null,
          startDate: new Date(data.startDate).toISOString(),
          endDate: new Date(data.endDate).toISOString(),
          probationEndDate: data.probationEndDate ? new Date(data.probationEndDate).toISOString() : null,
          // Clearing the field yields NaN (valueAsNumber on an empty input). Send
          // an explicit 0 — not undefined — so the cleared value persists instead
          // of the backend keeping the previous quota (totalLeaves is non-nullable,
          // so 0 is the correct "empty" value) (#28).
          totalLeaves: Number.isFinite(data.totalLeaves) ? Number(data.totalLeaves) : 0,
          notes: data.notes.trim() || null,
        },
      })
      router.push('/dashboard/hr/contracts')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update contract'))
    }
  }

  const isSaving = updateMutation.isPending

  if (isLoadingContract) {
    return (
      <ProtectedRoute requiredPermission="hr.manage_contracts">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!contract) {
    return (
      <ProtectedRoute requiredPermission="hr.manage_contracts">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-red-500">
          <p>Contract not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/hr/contracts')} className="mt-4">
            Back to Contracts
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="hr.manage_contracts">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/hr/contracts')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <FileSignature className="h-8 w-8 text-green-600" />
              Edit Contract
            </h1>
            <p className="text-gray-600 mt-1">Update assignment, dates, leave quota or notes.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Assignment</CardTitle>
              <CardDescription>Department and position for this contract.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="departmentId" className="text-gray-700 font-medium">
                    Department
                  </Label>
                  <Controller
                    control={control}
                    name="departmentId"
                    render={({ field }) => (
                      <Select
                        key={`${contract.id}-${isHydrated ? 'ready' : 'loading'}-${isLoadingDepartments ? 'l' : 'r'}`}
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="departmentId" className="mt-1.5 h-11 border-gray-300">
                          <SelectValue placeholder={isLoadingDepartments ? 'Loading…' : 'Select department'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_VALUE}>None</SelectItem>
                          {departments.map((d) => (
                            <SelectItem key={d.id} value={d.id}>
                              {d.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label htmlFor="positionId" className="text-gray-700 font-medium">
                    Position
                  </Label>
                  <Controller
                    control={control}
                    name="positionId"
                    render={({ field }) => (
                      <Select
                        key={`${contract.id}-${isHydrated ? 'ready' : 'loading'}-${isLoadingPositions ? 'l' : 'r'}`}
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="positionId" className="mt-1.5 h-11 border-gray-300">
                          <SelectValue placeholder={isLoadingPositions ? 'Loading…' : 'Select position'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_VALUE}>None</SelectItem>
                          {positions.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Duration & Leaves</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate" className="text-gray-700 font-medium">
                    Start Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    {...register('startDate', { required: 'Start date is required' })}
                    className="mt-1.5 h-11 border-gray-300"
                  />
                  {errors.startDate && <p className="text-sm text-red-600 mt-1">{errors.startDate.message}</p>}
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-gray-700 font-medium">
                    End Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    {...register('endDate', { required: 'End date is required' })}
                    className="mt-1.5 h-11 border-gray-300"
                  />
                  {errors.endDate && <p className="text-sm text-red-600 mt-1">{errors.endDate.message}</p>}
                </div>
                <div>
                  <Label htmlFor="probationEndDate" className="text-gray-700 font-medium">
                    Probation End Date
                  </Label>
                  <Input
                    id="probationEndDate"
                    type="date"
                    {...register('probationEndDate')}
                    className="mt-1.5 h-11 border-gray-300"
                  />
                </div>
                <div>
                  <Label htmlFor="totalLeaves" className="text-gray-700 font-medium">
                    Total Leaves
                  </Label>
                  <Input
                    id="totalLeaves"
                    type="number"
                    step="0.5"
                    min={0}
                    {...register('totalLeaves', {
                      min: { value: 0, message: 'Must be 0 or more' },
                      valueAsNumber: true,
                    })}
                    className="mt-1.5 h-11 border-gray-300"
                  />
                  {errors.totalLeaves && <p className="text-sm text-red-600 mt-1">{errors.totalLeaves.message}</p>}
                </div>
              </div>
              <div>
                <Label htmlFor="notes" className="text-gray-700 font-medium">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  {...register('notes')}
                  rows={3}
                  className="mt-1.5 border-gray-300"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/hr/contracts')}
              disabled={isSaving}
              className="border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700 text-white min-w-[120px]"
            >
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" />Save Changes</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
