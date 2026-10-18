'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { toast } from 'react-hot-toast'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import {
  useCreateEmployee,
  useRolesDropdown,
  type LoginAccess,
  type EmployeeStatus,
} from '@/hooks/useEmployees'
import { useShiftsDropdown } from '@/hooks/useShifts'
import { getApiErrorMessage } from '@/lib/api-error'
import { ArrowLeft, Eye, EyeOff, Loader2, Save, User } from 'lucide-react'

interface EmployeeFormData {
  firstName: string
  lastName: string
  employeeCode: string
  dateOfJoining: string
  status: EmployeeStatus
  loginAccess: LoginAccess
  email: string
  phone: string
  roleId: string
  password: string
  shiftId: string
}

export default function CreateEmployeePage() {
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const createMutation = useCreateEmployee()
  const { data: roles = [], isLoading: isLoadingRoles } = useRolesDropdown()
  const { data: shifts = [], isLoading: isLoadingShifts } = useShiftsDropdown()

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm<EmployeeFormData>({
    defaultValues: {
      firstName: '',
      lastName: '',
      employeeCode: '',
      dateOfJoining: '',
      status: 'ACTIVE',
      loginAccess: 'DISABLED',
      email: '',
      phone: '',
      roleId: '',
      password: '',
      shiftId: '',
    },
  })

  const loginAccess = watch('loginAccess')
  const email = watch('email')
  // A User account is created for any employee with an email → role becomes required.
  const requiresAccount = loginAccess === 'ENABLED' || !!email.trim()

  const onSubmit = async (data: EmployeeFormData) => {
    try {
      await createMutation.mutateAsync({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        employeeCode: data.employeeCode.trim(),
        dateOfJoining: new Date(data.dateOfJoining).toISOString(),
        status: data.status,
        loginAccess: data.loginAccess,
        email: data.email.trim() || undefined,
        phone: data.phone.trim() || undefined,
        roleId: requiresAccount ? data.roleId || undefined : undefined,
        password: data.loginAccess === 'ENABLED' ? data.password || undefined : undefined,
        // shiftId is required on every hire (laborers included) — always sent.
        shiftId: data.shiftId,
      })
      router.push('/dashboard/hr/employees')
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to create employee'))
    }
  }

  const isLoading = createMutation.isPending

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
              Add Employee
            </h1>
            <p className="text-gray-600 mt-1">Hire a new person — optionally grant system login.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Personal Information</CardTitle>
              <CardDescription>Name and contact details.</CardDescription>
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
                    placeholder="e.g. Ali"
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
                    placeholder="e.g. Khan"
                    className="mt-1.5 h-11 border-gray-300"
                  />
                  {errors.lastName && <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>}
                </div>
                <div>
                  <Label htmlFor="email" className="text-gray-700 font-medium">
                    Email {loginAccess === 'ENABLED' && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email', {
                      validate: (v) =>
                        loginAccess !== 'ENABLED' || v.trim().length > 0 || 'Email is required for login access',
                      maxLength: { value: 128, message: 'Max 128 characters' },
                    })}
                    placeholder="e.g. ali.khan@company.com"
                    className="mt-1.5 h-11 border-gray-300"
                  />
                  <p className="text-xs text-gray-500 mt-1">Leave empty for laborers with no system access.</p>
                  {errors.email && <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <Label htmlFor="phone" className="text-gray-700 font-medium">
                    Phone
                  </Label>
                  <Input
                    id="phone"
                    {...register('phone', { maxLength: { value: 32, message: 'Max 32 characters' } })}
                    placeholder="e.g. +92 300 1234567"
                    className="mt-1.5 h-11 border-gray-300"
                  />
                  {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Employment Details</CardTitle>
              <CardDescription>HR record and system access.</CardDescription>
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
                    placeholder="e.g. EMP-001"
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
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
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
                  <Label htmlFor="loginAccess" className="text-gray-700 font-medium">
                    Login Access
                  </Label>
                  <Controller
                    control={control}
                    name="loginAccess"
                    render={({ field }) => (
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger id="loginAccess" className="mt-1.5 h-11 border-gray-300">
                          <SelectValue placeholder="Select login access" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DISABLED">Disabled — laborer, no login</SelectItem>
                          <SelectItem value="ENABLED">Enabled — can log in</SelectItem>
                          <SelectItem value="SUSPENDED">Suspended — login temporarily blocked</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <Label htmlFor="shiftId" className="text-gray-700 font-medium">
                    Shift <span className="text-red-500">*</span>
                  </Label>
                  <Controller
                    control={control}
                    name="shiftId"
                    rules={{ required: 'Shift is required' }}
                    render={({ field }) => (
                      <Select value={field.value || undefined} onValueChange={field.onChange}>
                        <SelectTrigger id="shiftId" className="mt-1.5 h-11 border-gray-300">
                          <SelectValue placeholder={isLoadingShifts ? 'Loading…' : 'Select a shift'} />
                        </SelectTrigger>
                        <SelectContent>
                          {shifts.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.shiftId && <p className="text-sm text-red-600 mt-1">{errors.shiftId.message}</p>}
                </div>
              </div>

              {requiresAccount && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="roleId" className="text-gray-700 font-medium">
                      Role <span className="text-red-500">*</span>
                    </Label>
                    <Controller
                      control={control}
                      name="roleId"
                      rules={{
                        validate: (v) =>
                          !requiresAccount || v.length > 0 || 'Role is required when an account is created',
                      }}
                      render={({ field }) => (
                        <Select value={field.value || undefined} onValueChange={field.onChange}>
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
                    {errors.roleId && <p className="text-sm text-red-600 mt-1">{errors.roleId.message}</p>}
                  </div>
                  {loginAccess === 'ENABLED' && (
                    <div>
                      <Label htmlFor="password" className="text-gray-700 font-medium">
                        Password <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative mt-1.5">
                        <Input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          {...register('password', {
                            validate: (v) =>
                              loginAccess !== 'ENABLED' || v.length >= 6 || 'Password must be at least 6 characters',
                          })}
                          placeholder="Min 6 characters"
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
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push('/dashboard/hr/employees')}
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
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" />Save Employee</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
