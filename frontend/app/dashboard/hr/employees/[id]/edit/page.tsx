'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import {
  useEmployee,
  useUpdateEmployee,
  useRolesDropdown,
  type LoginAccess,
  type EmployeeStatus,
  type UpdateEmployeePayload,
} from '@/hooks/useEmployees'
import { useShiftsDropdown } from '@/hooks/useShifts'
import { getApiErrorMessage } from '@/lib/api-error'
import { ArrowLeft, Eye, EyeOff, Loader2, Save, User } from 'lucide-react'

const NO_SHIFT = '__none__'

interface EmployeeEditFormData {
  firstName: string
  lastName: string
  email: string
  phone: string
  roleId: string
  loginAccess: LoginAccess
  password: string
  employeeCode: string
  dateOfJoining: string
  status: EmployeeStatus
  shiftId: string
}

export default function EditEmployeePage() {
  const router = useRouter()
  const params = useParams()
  const employeeId = params?.id as string

  const { data: employee, isLoading: isLoadingEmployee } = useEmployee(employeeId)
  const { data: roles = [], isLoading: isLoadingRoles } = useRolesDropdown()
  const { data: shifts = [], isLoading: isLoadingShifts } = useShiftsDropdown()
  const updateMutation = useUpdateEmployee()
  const [showPassword, setShowPassword] = useState(false)

  // Tracks whether reset() below has actually applied the fetched employee's
  // values to the form yet. The Selects key off this (not off employee.id, which
  // never changes, and not off the roles/shifts dropdown loading flags, which are
  // unrelated) so they remount exactly once real data lands — Radix Select only
  // repaints its displayed value on a remount, not on a bare controlled-value
  // change after the trigger has already rendered once with the blank default (#2).
  const [isHydrated, setIsHydrated] = useState(false)

  const hasAccount = !!employee?.user

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, dirtyFields },
  } = useForm<EmployeeEditFormData>({
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      roleId: '',
      loginAccess: 'DISABLED',
      password: '',
      employeeCode: '',
      dateOfJoining: '',
      status: 'ACTIVE',
      shiftId: NO_SHIFT,
    },
  })

  const loginAccess = watch('loginAccess')

  useEffect(() => {
    if (employee) {
      reset({
        firstName: employee.user?.firstName || '',
        lastName: employee.user?.lastName || '',
        email: employee.user?.email || '',
        phone: employee.user?.phone || '',
        roleId: employee.user?.role?.id || '',
        loginAccess: employee.user?.loginAccess || 'DISABLED',
        password: '',
        employeeCode: employee.employeeCode || '',
        dateOfJoining: employee.dateOfJoining ? employee.dateOfJoining.slice(0, 10) : '',
        status: employee.status,
        shiftId: employee.shiftId || NO_SHIFT,
      })
      setIsHydrated(true)
    }
  }, [employee, reset])

  const onSubmit = async (data: EmployeeEditFormData) => {
    try {
      // Send ONLY the fields the user actually changed, so an untouched edit
      // (e.g. changing just the shift) never re-submits loginAccess/password and
      // a blank password field simply keeps the existing password. dirtyFields
      // is measured against the values reset() applied from the fetched record.
      const payload: UpdateEmployeePayload = {}

      if (dirtyFields.employeeCode) payload.employeeCode = data.employeeCode.trim()
      if (dirtyFields.dateOfJoining) payload.dateOfJoining = new Date(data.dateOfJoining).toISOString()
      if (dirtyFields.status) payload.status = data.status
      // Send explicit null to clear the shift assignment.
      if (dirtyFields.shiftId) payload.shiftId = data.shiftId === NO_SHIFT ? null : data.shiftId
      if (dirtyFields.firstName) payload.firstName = data.firstName.trim()
      if (dirtyFields.lastName) payload.lastName = data.lastName.trim()
      // Send explicit null (not undefined) so the backend clears a cleared field (#12).
      if (dirtyFields.email) payload.email = data.email.trim() || null
      if (dirtyFields.phone) payload.phone = data.phone.trim() || null
      if (dirtyFields.loginAccess) payload.loginAccess = data.loginAccess
      if (dirtyFields.roleId) payload.roleId = data.roleId || undefined
      // Only send the password when the user actually typed a new one — a blank
      // password field means "keep current password".
      if (dirtyFields.password && data.password) payload.password = data.password

      if (Object.keys(payload).length === 0) {
        router.push('/dashboard/hr/employees')
        return
      }

      await updateMutation.mutateAsync({ id: employeeId, data: payload })
      router.push('/dashboard/hr/employees')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to update employee'))
    }
  }

  const isSaving = updateMutation.isPending

  if (isLoadingEmployee) {
    return (
      <ProtectedRoute requiredPermission="hr.manage_employees">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  if (!employee) {
    return (
      <ProtectedRoute requiredPermission="hr.manage_employees">
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 text-center text-red-500">
          <p>Employee not found</p>
          <Button variant="outline" onClick={() => router.push('/dashboard/hr/employees')} className="mt-4">
            Back to Employees
          </Button>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="hr.manage_employees">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard/hr/employees')}
            className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <User className="h-8 w-8 text-green-600" />
              Edit Employee
            </h1>
            <p className="text-gray-600 mt-1">Update HR record{hasAccount ? ' and account details' : ''}.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Account & Personal Information</CardTitle>
              <CardDescription>Name and contact details — plus login access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName" className="text-gray-700 font-medium">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="firstName"
                    {...register('firstName', {
                      required: 'First name is required',
                      validate: (v) => v.trim().length > 0 || 'First name is required',
                      maxLength: { value: 64, message: 'Max 64 characters' },
                    })}
                    className="mt-1.5 h-11 border-gray-300"
                  />
                  {errors.firstName && <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-gray-700 font-medium">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="lastName"
                    {...register('lastName', {
                      required: 'Last name is required',
                      validate: (v) => v.trim().length > 0 || 'Last name is required',
                      maxLength: { value: 64, message: 'Max 64 characters' },
                    })}
                    className="mt-1.5 h-11 border-gray-300"
                  />
                  {errors.lastName && <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="email" className="text-gray-700 font-medium">
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email', { maxLength: { value: 128, message: 'Max 128 characters' } })}
                    className="mt-1.5 h-11 border-gray-300"
                  />
                  {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="phone" className="text-gray-700 font-medium">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    {...register('phone', { maxLength: { value: 32, message: 'Max 32 characters' } })}
                    className="mt-1.5 h-11 border-gray-300"
                  />
                  {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>}
                </div>
                <div>
                  <Label htmlFor="loginAccess" className="text-gray-700 font-medium">
                    Login Access
                  </Label>
                  <Controller
                    control={control}
                    name="loginAccess"
                    render={({ field }) => (
                      <Select
                        key={`${employee.id}-${isHydrated ? 'ready' : 'loading'}`}
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="loginAccess" className="mt-1.5 h-11 border-gray-300">
                          <SelectValue placeholder="Select login access" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ENABLED">Enabled</SelectItem>
                          <SelectItem value="DISABLED">Disabled</SelectItem>
                          <SelectItem value="SUSPENDED">Suspended</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                {loginAccess === 'ENABLED' && (
                  <div>
                    <Label htmlFor="roleId" className="text-gray-700 font-medium">
                      Role
                    </Label>
                    <Controller
                      control={control}
                      name="roleId"
                      render={({ field }) => (
                        <Select
                          key={`${employee.id}-${isHydrated ? 'ready' : 'loading'}-${isLoadingRoles ? 'l' : 'r'}`}
                          value={field.value || undefined}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger id="roleId" className="mt-1.5 h-11 border-gray-300">
                            <SelectValue placeholder={isLoadingRoles ? 'Loading…' : 'Select a role'} />
                          </SelectTrigger>
                          <SelectContent>
                            {roles.map((r) => (
                              <SelectItem key={r.id} value={r.id}>
                                {r.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                )}
                {loginAccess === 'ENABLED' && (
                  <div className="md:col-span-2">
                    <Label htmlFor="password" className="text-gray-700 font-medium">
                      New Password
                    </Label>
                    <div className="relative mt-1.5">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        {...register('password', {
                          validate: (v) =>
                            !v || v.length >= 6 || 'Password must be at least 6 characters',
                        })}
                        placeholder="Leave blank to keep current password"
                        className="h-11 pr-10 border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-sm text-red-600 mt-1">{errors.password.message}</p>}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Employment Details</CardTitle>
              <CardDescription>HR record and shift assignment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="employeeCode" className="text-gray-700 font-medium">
                    Employee Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="employeeCode"
                    {...register('employeeCode', {
                      required: 'Employee code is required',
                      validate: (v) => v.trim().length > 0 || 'Employee code is required',
                      maxLength: { value: 32, message: 'Max 32 characters' },
                    })}
                    className="mt-1.5 h-11 border-gray-300"
                  />
                  {errors.employeeCode && <p className="text-sm text-red-600 mt-1">{errors.employeeCode.message}</p>}
                </div>
                <div>
                  <Label htmlFor="dateOfJoining" className="text-gray-700 font-medium">
                    Date of Joining <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dateOfJoining"
                    type="date"
                    {...register('dateOfJoining', { required: 'Date of joining is required' })}
                    className="mt-1.5 h-11 border-gray-300"
                  />
                  {errors.dateOfJoining && <p className="text-sm text-red-600 mt-1">{errors.dateOfJoining.message}</p>}
                </div>
                <div>
                  <Label htmlFor="status" className="text-gray-700 font-medium">
                    Status
                  </Label>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Select
                        key={`${employee.id}-${isHydrated ? 'ready' : 'loading'}`}
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="status" className="mt-1.5 h-11 border-gray-300">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="ONBOARDING">Onboarding</SelectItem>
                          <SelectItem value="INACTIVE">Inactive</SelectItem>
                          <SelectItem value="TERMINATED">Terminated</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label htmlFor="shiftId" className="text-gray-700 font-medium">
                    Shift
                  </Label>
                  <Controller
                    control={control}
                    name="shiftId"
                    render={({ field }) => (
                      <Select
                        key={`${employee.id}-${isHydrated ? 'ready' : 'loading'}-${isLoadingShifts ? 'l' : 'r'}`}
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger id="shiftId" className="mt-1.5 h-11 border-gray-300">
                          <SelectValue placeholder={isLoadingShifts ? 'Loading…' : 'Select a shift'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NO_SHIFT}>No shift assigned</SelectItem>
                          {shifts.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
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

          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/hr/employees')}
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
