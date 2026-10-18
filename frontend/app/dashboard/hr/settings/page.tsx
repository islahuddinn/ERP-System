'use client'

import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Settings as SettingsIcon, Loader2, Save } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { ViewHistoryButton } from '@/components/audit/entity-history'
import {
  useHrSettings,
  useUpdateHrSettings,
  WEEK_DAYS,
  type WeekDay,
} from '@/hooks/useHrSettings'

interface HrSettingsFormData {
  weeklyOffDays: WeekDay[]
  timezone: string
  currency: string
  maxLoanInstallmentPercent: number
  settingsJson: string
}

const dayLabel = (day: WeekDay) => day.charAt(0) + day.slice(1).toLowerCase()

// The `settings` field is a free-form JSON object; the form edits it as a JSON string.
const stringifySettings = (settings: Record<string, unknown> | undefined) =>
  JSON.stringify(settings ?? {}, null, 2)

const isValidJsonObject = (value: string): boolean => {
  try {
    const parsed = JSON.parse(value)
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
  } catch {
    return false
  }
}

export default function HrSettingsPage() {
  const { data: settings, isLoading } = useHrSettings()
  const updateMutation = useUpdateHrSettings()

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<HrSettingsFormData>({
    defaultValues: {
      weeklyOffDays: [],
      timezone: '',
      currency: '',
      maxLoanInstallmentPercent: 70,
      settingsJson: '{}',
    },
  })

  useEffect(() => {
    if (settings) {
      reset({
        weeklyOffDays: settings.weeklyOffDays ?? [],
        timezone: settings.timezone ?? '',
        currency: settings.currency ?? '',
        maxLoanInstallmentPercent: settings.maxLoanInstallmentPercent ?? 70,
        settingsJson: stringifySettings(settings.settings),
      })
    }
  }, [settings, reset])

  const onSubmit = async (data: HrSettingsFormData) => {
    await updateMutation.mutateAsync({
      weeklyOffDays: data.weeklyOffDays,
      // Send explicit null to clear the optional fields when left blank.
      timezone: data.timezone.trim() || null,
      currency: data.currency.trim() || null,
      maxLoanInstallmentPercent: Number(data.maxLoanInstallmentPercent),
      // Validation guarantees this parses into a plain object.
      settings: JSON.parse(data.settingsJson) as Record<string, unknown>,
    })
  }

  const isSaving = updateMutation.isPending

  if (isLoading) {
    return (
      <ProtectedRoute requiredPermission="hr-settings.view">
        <div className="flex-1 flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute requiredPermission="hr-settings.view">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <SettingsIcon className="h-8 w-8 text-green-600" />
              HR Settings
            </h1>
            <p className="text-gray-600 mt-1">Tenant-wide HR configuration used for attendance, payroll and loans.</p>
          </div>
          <ViewHistoryButton entityName="HrSettings" entityId={settings?.id ?? ''} size="default" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-2xl">
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900">Working Week &amp; Locale</CardTitle>
              <CardDescription>Configure weekly offs, timezone and payroll currency.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label className="text-gray-700 font-medium">Weekly Off Days</Label>
                <p className="text-xs text-gray-500 mb-2">Days treated as weekly off for attendance calculations.</p>
                <Controller
                  control={control}
                  name="weeklyOffDays"
                  render={({ field }) => (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {WEEK_DAYS.map((day) => {
                        const checked = field.value.includes(day)
                        return (
                          <label
                            key={day}
                            className="flex items-center gap-2 rounded-md border border-gray-200 p-2 cursor-pointer hover:bg-gray-50"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(c) => {
                                if (c === true) field.onChange([...field.value, day])
                                else field.onChange(field.value.filter((d) => d !== day))
                              }}
                            />
                            <span className="text-sm text-gray-700">{dayLabel(day)}</span>
                          </label>
                        )
                      })}
                    </div>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="timezone" className="text-gray-700 font-medium">Timezone</Label>
                  <Input
                    id="timezone"
                    {...register('timezone')}
                    placeholder="e.g. Asia/Karachi"
                    className="mt-1.5 h-11 border-gray-300"
                  />
                  <p className="text-xs text-gray-500 mt-1">IANA timezone used for HR calculations.</p>
                </div>
                <div>
                  <Label htmlFor="currency" className="text-gray-700 font-medium">Payroll Currency</Label>
                  <Input
                    id="currency"
                    {...register('currency')}
                    placeholder="e.g. PKR"
                    className="mt-1.5 h-11 border-gray-300"
                  />
                  <p className="text-xs text-gray-500 mt-1">Currency code used for payroll.</p>
                </div>
              </div>

              <div>
                <Label htmlFor="maxLoanInstallmentPercent" className="text-gray-700 font-medium">
                  Max Loan Installment (% of monthly salary)
                </Label>
                <Input
                  id="maxLoanInstallmentPercent"
                  type="number"
                  min={1}
                  max={100}
                  {...register('maxLoanInstallmentPercent', {
                    required: 'This field is required',
                    min: { value: 1, message: 'Must be at least 1' },
                    max: { value: 100, message: 'Cannot exceed 100' },
                    valueAsNumber: true,
                  })}
                  className="mt-1.5 h-11 border-gray-300 max-w-[200px]"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The largest share of an employee&apos;s monthly salary a single loan installment may consume.
                </p>
                {errors.maxLoanInstallmentPercent && (
                  <p className="text-sm text-red-600 mt-1">{errors.maxLoanInstallmentPercent.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="settingsJson" className="text-gray-700 font-medium">
                  Additional Settings (JSON)
                </Label>
                <textarea
                  id="settingsJson"
                  {...register('settingsJson', {
                    validate: (value) =>
                      isValidJsonObject(value) || 'Must be a valid JSON object',
                  })}
                  spellCheck={false}
                  rows={6}
                  placeholder="{}"
                  className="mt-1.5 w-full min-h-[120px] p-3 font-mono text-sm border border-gray-300 rounded-md resize-y focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Catch-all for ad-hoc HR settings that don&apos;t yet warrant a dedicated field. Must be a JSON object.
                </p>
                {errors.settingsJson && (
                  <p className="text-sm text-red-600 mt-1">{errors.settingsJson.message}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-4">
            <Button
              type="submit"
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700 text-white min-w-[140px]"
            >
              {isSaving ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              ) : (
                <><Save className="mr-2 h-4 w-4" />Save Settings</>
              )}
            </Button>
          </div>
        </form>
      </div>
    </ProtectedRoute>
  )
}
