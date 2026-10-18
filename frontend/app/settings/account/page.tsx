'use client'

import { useEffect, useState, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ImageIcon, Lock, Loader2 } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'react-hot-toast'
import { useBranding, useUpdateBranding } from '@/hooks/useBranding'
import { useCurrency } from '@/contexts/currency-context'

export default function AccountSettingsPage() {
  const { data: session } = useSession()
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'
  const { data: branding, isLoading: brandingLoading } = useBranding()
  const updateBranding = useUpdateBranding()
  const { currency, currencies, setCurrency, isSaving: isSavingCurrency } = useCurrency()
  const logoInputRef = useRef<HTMLInputElement>(null)
  const isResettingRef = useRef(false)
  const [brandingName, setBrandingName] = useState('')
  const [brandingLogoFile, setBrandingLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [brandingSuccess, setBrandingSuccess] = useState('')
  const [brandingError, setBrandingError] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (branding && !isResettingRef.current) {
      setBrandingName(branding.name ?? '')
      setLogoPreview(branding.logoUrl ?? null)
      setBrandingSuccess('')
      setBrandingError('')
      setBrandingLogoFile(null)
    }
    // Reset the flag after a short delay to allow reset to complete
    if (isResettingRef.current) {
      const timer = setTimeout(() => {
        isResettingRef.current = false
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [branding])

  const handleBrandingSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBrandingError('')
    setBrandingSuccess('')

    if (!brandingLogoFile && brandingName.trim() === (branding?.name ?? '').trim()) {
      setBrandingSuccess('Branding is already up to date.')
      return
    }

    try {
      const trimmedName = brandingName.trim()
      await updateBranding.mutateAsync({
        brandingName: trimmedName.length > 0 ? trimmedName : undefined,
        logoFile: brandingLogoFile ?? undefined,
      })
      setBrandingLogoFile(null)
      setBrandingSuccess('Branding updated successfully.')
    } catch (error: any) {
      const message = error?.response?.data?.message || error.message || 'Failed to update branding.'
      setBrandingError(Array.isArray(message) ? message[0] : message)
    }
  }

  const handleLogoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      setBrandingLogoFile(null)
      setLogoPreview(branding?.logoUrl ?? null)
      return
    }

    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setBrandingError('Only PNG, JPEG, and WEBP files are allowed.')
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setBrandingError('Logo must be smaller than 2 MB.')
      return
    }

    const objectUrl = URL.createObjectURL(file)
    const image = typeof window !== 'undefined' ? new window.Image() : null

    if (!image) {
      setBrandingError('Image preview is not supported in this environment.')
      URL.revokeObjectURL(objectUrl)
      return
    }

    image.onload = () => {
      const minDimension = Math.min(image.width, image.height)
      const aspectRatio = image.width > image.height ? image.width / image.height : image.height / image.width

      if (minDimension < 128) {
        setBrandingError('Logo should be at least 128×128 pixels.')
        URL.revokeObjectURL(objectUrl)
        return
      }

      if (aspectRatio > 2) {
        setBrandingError('Please upload a logo that is roughly square for the best fit.')
        URL.revokeObjectURL(objectUrl)
        return
      }

      setBrandingError('')
      setBrandingLogoFile(file)
      setLogoPreview(objectUrl)
    }

    image.onerror = () => {
      setBrandingError('Unable to read the selected image. Please try another file.')
      URL.revokeObjectURL(objectUrl)
    }

    image.src = objectUrl
  }

  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith('blob:')) {
        URL.revokeObjectURL(logoPreview)
      }
    }
  }, [logoPreview])

  const resetMessages = () => {
    setSuccessMessage('')
    setErrorMessage('')
  }

  const handleCurrencyChange = async (code: string) => {
    if (code === currency.code) return
    try {
      await setCurrency(code)
      toast.success('Currency updated')
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to update currency.')
    }
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    resetMessages()

    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation do not match.')
      return
    }

    if (newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.')
      return
    }

    if (!session?.accessToken || !session.user?.tenantId) {
      setErrorMessage('You are not authenticated. Please sign in again.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch(`${apiBaseUrl}/auth/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
          'X-Tenant-Id': session.user.tenantId,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.message || 'Failed to change password. Please try again.')
      }

      setSuccessMessage('Password updated successfully.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to change password.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="flex flex-col gap-3">
        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-green-500/20 border border-green-400/40">
          <Lock className="h-5 w-5 text-green-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Account Settings</h1>
          <p className="text-sm text-gray-400">
            Keep your account secure by updating your password with strong, memorable credentials.
          </p>
        </div>
      </div>

      <Card className="glass-card border border-white/10">
        <CardHeader>
          <CardTitle className="text-xl text-white">Branding</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleBrandingSubmit} className="space-y-6">
            {brandingError && (
              <Alert className="border-red-500/40 bg-red-500/10 text-red-300">
                <AlertDescription>{brandingError}</AlertDescription>
              </Alert>
            )}

            {brandingSuccess && (
              <Alert className="border-green-500/40 bg-green-500/10 text-green-300">
                <AlertDescription>{brandingSuccess}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="brandingName" className="text-gray-200">
                Display Name
              </Label>
              <Input
                id="brandingName"
                type="text"
                placeholder="Your business name"
                value={brandingName}
                onChange={(event) => setBrandingName(event.target.value)}
                disabled={brandingLoading || updateBranding.isPending}
                maxLength={60}
                className="bg-white/10 border-white/10 text-white placeholder-gray-400"
              />
              <p className="text-xs text-gray-500">Shown in the sidebar and dashboard welcome message.</p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="brandingLogo" className="text-gray-200">
                Logo
              </Label>
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden">
                  {logoPreview ? (
                    <Image
                      src={logoPreview}
                      alt="Branding preview"
                      width={72}
                      height={72}
                      className="object-contain"
                    />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-gray-400" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    ref={logoInputRef}
                    id="brandingLogo"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleLogoChange}
                    disabled={brandingLoading || updateBranding.isPending}
                    className="bg-white/10 border-white/10 text-white file:bg-white/10 file:text-white"
                  />
                  <p className="text-xs text-gray-500">
                    PNG, JPG, or WEBP. Max 2&nbsp;MB. For the sharpest display, upload a square logo at least 256×256 pixels.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={updateBranding.isPending}
                className="border-white/20 text-gray-200"
                onClick={async () => {
                  // Set flag to prevent useEffect from overriding
                  isResettingRef.current = true
                  
                  // Reset file input
                  if (logoInputRef.current) {
                    logoInputRef.current.value = ''
                  }
                  
                  // Revoke any blob URL if exists
                  if (logoPreview && logoPreview.startsWith('blob:')) {
                    URL.revokeObjectURL(logoPreview)
                  }
                  
                  // Clear messages
                  setBrandingError('')
                  setBrandingSuccess('')
                  
                  try {
                    // Check if there's a custom uploaded logo that needs to be deleted
                    const hasCustomLogo = !!(branding?.logoUrl && !branding.logoUrl.startsWith('/images/'))
                    
                    // Save the reset to backend
                    await updateBranding.mutateAsync({
                      brandingName: 'Malind Tech',
                      logoFile: undefined,
                      deleteLogo: hasCustomLogo || undefined, // Delete logo if it's a custom uploaded one
                    })
                    
                    // Update local state
                    setBrandingName('Malind Tech')
                    setBrandingLogoFile(null)
                    setLogoPreview('/images/Marketing-malindtech (1).png')
                    
                    setBrandingSuccess('Branding reset to default successfully')
                  } catch (error: any) {
                    setBrandingError(error?.response?.data?.message || error.message || 'Failed to reset branding')
                  }
                }}
              >
                Reset
              </Button>
              <Button
                type="submit"
                disabled={brandingLoading || updateBranding.isPending}
                className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
              >
                {updateBranding.isPending ? 'Saving...' : 'Save Branding'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="glass-card border border-white/10">
        <CardHeader>
          <CardTitle className="text-xl text-white">Currency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="displayCurrency" className="text-gray-200">
              Display Currency
            </Label>
            <div className="flex items-center gap-3">
              <Select
                value={currency.code}
                onValueChange={handleCurrencyChange}
                disabled={isSavingCurrency}
              >
                <SelectTrigger id="displayCurrency" className="max-w-sm">
                  <SelectValue placeholder="Select a currency" />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((option) => (
                    <SelectItem key={option.code} value={option.code}>
                      {`${option.symbol} — ${option.name} (${option.code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isSavingCurrency && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            </div>
            <p className="text-xs text-gray-500">
              Applied across the whole app. Amounts are shown with this symbol (no conversion).
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border border-white/10">
        <CardHeader>
          <CardTitle className="text-xl text-white">Change Password</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {successMessage && (
              <Alert className="border-green-500/40 bg-green-500/10 text-green-300">
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}

            {errorMessage && (
              <Alert className="border-red-500/40 bg-red-500/10 text-red-300">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-gray-200">
                  Current Password
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  placeholder="Enter current password"
                  required
                  className="bg-white/10 border-white/10 text-white placeholder-gray-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-gray-200">
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Enter new password"
                  required
                  minLength={8}
                  className="bg-white/10 border-white/10 text-white placeholder-gray-400"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="confirmPassword" className="text-gray-200">
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm new password"
                  required
                  minLength={8}
                  className="bg-white/10 border-white/10 text-white placeholder-gray-400"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="border-white/20 text-gray-200"
                onClick={() => {
                  setCurrentPassword('')
                  setNewPassword('')
                  setConfirmPassword('')
                  resetMessages()
                }}
              >
                Clear
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
              >
                {isSubmitting ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

