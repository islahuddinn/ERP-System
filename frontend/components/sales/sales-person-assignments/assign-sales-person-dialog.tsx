'use client'

import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Loader2, UserPlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useEmployeesDropdown, employeeLabel } from '@/hooks/useEmployees'
import { useAssignSalesPerson } from '@/hooks/useSalesPersonAssignments'

interface AssignSalesPersonDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Employee IDs already assigned on the current list — hide from picker when possible. */
  assignedEmployeeIds?: string[]
}

interface AssignFormData {
  employeeId: string
}

export function AssignSalesPersonDialog({
  open,
  onOpenChange,
  assignedEmployeeIds = [],
}: AssignSalesPersonDialogProps) {
  const assignMutation = useAssignSalesPerson()
  const { data: employees = [], isLoading: loadingEmployees } = useEmployeesDropdown()
  const [isHydrated, setIsHydrated] = useState(false)

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<AssignFormData>({ defaultValues: { employeeId: '' } })

  useEffect(() => {
    if (open) {
      reset({ employeeId: '' })
      setIsHydrated(true)
    } else {
      setIsHydrated(false)
    }
  }, [open, reset])

  const availableEmployees = employees.filter((employee) => !assignedEmployeeIds.includes(employee.id))

  const onSubmit = async (data: AssignFormData) => {
    await assignMutation.mutateAsync({ employeeId: data.employeeId })
    onOpenChange(false)
  }

  const isLoading = assignMutation.isPending

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Sales Person</DialogTitle>
          <DialogDescription>
            Link an employee to your distributor branch so they can book shop orders and handle deliveries.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="assign-employee" className="text-gray-700 font-medium">
              Employee <span className="text-red-500">*</span>
            </Label>
            <Controller
              control={control}
              name="employeeId"
              rules={{ required: 'Select an employee' }}
              render={({ field }) => (
                <Select
                  key={`employee-${isHydrated ? 'ready' : 'loading'}`}
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={loadingEmployees}
                >
                  <SelectTrigger id="assign-employee" className="mt-1.5 h-11 border-gray-300">
                    <SelectValue placeholder={loadingEmployees ? 'Loading employees…' : 'Select employee'} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableEmployees.length === 0 ? (
                      <SelectItem value="__none__" disabled>
                        No available employees
                      </SelectItem>
                    ) : (
                      availableEmployees.map((employee) => (
                        <SelectItem key={employee.id} value={employee.id}>
                          {employeeLabel(employee)}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.employeeId && (
              <p className="text-sm text-red-600 mt-1">{errors.employeeId.message}</p>
            )}
          </div>

          <DialogFooter className="gap-2 sm:justify-end pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || availableEmployees.length === 0}
              className="bg-green-600 hover:bg-green-700 text-white min-w-[130px]"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning…
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
