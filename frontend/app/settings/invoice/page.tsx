'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Receipt } from 'lucide-react'
import { useInvoiceSettings, useUpdateInvoiceSettings, UpdateInvoiceSettingsDto } from '@/hooks/useInvoiceSettings'
import { Separator } from '@/components/ui/separator'

export default function InvoiceSettingsPage() {
  const { data: settings, isLoading } = useInvoiceSettings()
  const updateSettings = useUpdateInvoiceSettings()
  const [formData, setFormData] = useState<UpdateInvoiceSettingsDto>({})
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  // Initialize form data when settings load
  useEffect(() => {
    if (settings) {
      setFormData({
        pageSize: settings.pageSize,
        pageOrientation: settings.pageOrientation,
        customPageWidth: settings.customPageWidth,
        customPageHeight: settings.customPageHeight,
        margin: settings.margin,
        showLogo: settings.showLogo,
        logoSize: settings.logoSize,
        logoPosition: settings.logoPosition,
        brandNameFontSize: settings.brandNameFontSize,
        brandNameColor: settings.brandNameColor,
        receiptTitle: settings.receiptTitle,
        receiptTitleFontSize: settings.receiptTitleFontSize,
        showLocationAddress: settings.showLocationAddress,
        showCustomerInfo: settings.showCustomerInfo,
        customerInfoFontSize: settings.customerInfoFontSize,
        showItemsTable: settings.showItemsTable,
        itemsTableFontSize: settings.itemsTableFontSize,
        showPayments: settings.showPayments,
        paymentsFontSize: settings.paymentsFontSize,
        footerText: settings.footerText,
        showFooter: settings.showFooter,
        footerFontSize: settings.footerFontSize,
        footerColor: settings.footerColor,
        dividerColor: settings.dividerColor,
        dividerStyle: settings.dividerStyle,
        backgroundColor: settings.backgroundColor,
        textColor: settings.textColor,
      })
    }
  }, [settings])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage('')
    setErrorMessage('')

    try {
      await updateSettings.mutateAsync(formData)
      setSuccessMessage('Invoice settings updated successfully')
    } catch (error: any) {
      setErrorMessage(error?.response?.data?.message || error?.message || 'Failed to update settings')
    }
  }

  const handleReset = () => {
    if (settings) {
      setFormData({
        pageSize: settings.pageSize,
        pageOrientation: settings.pageOrientation,
        customPageWidth: settings.customPageWidth,
        customPageHeight: settings.customPageHeight,
        margin: settings.margin,
        showLogo: settings.showLogo,
        logoSize: settings.logoSize,
        logoPosition: settings.logoPosition,
        brandNameFontSize: settings.brandNameFontSize,
        brandNameColor: settings.brandNameColor,
        receiptTitle: settings.receiptTitle,
        receiptTitleFontSize: settings.receiptTitleFontSize,
        showLocationAddress: settings.showLocationAddress,
        showCustomerInfo: settings.showCustomerInfo,
        customerInfoFontSize: settings.customerInfoFontSize,
        showItemsTable: settings.showItemsTable,
        itemsTableFontSize: settings.itemsTableFontSize,
        showPayments: settings.showPayments,
        paymentsFontSize: settings.paymentsFontSize,
        footerText: settings.footerText,
        showFooter: settings.showFooter,
        footerFontSize: settings.footerFontSize,
        footerColor: settings.footerColor,
        dividerColor: settings.dividerColor,
        dividerStyle: settings.dividerStyle,
        backgroundColor: settings.backgroundColor,
        textColor: settings.textColor,
      })
      setSuccessMessage('')
      setErrorMessage('')
    }
  }

  const updateField = <K extends keyof UpdateInvoiceSettingsDto>(
    field: K,
    value: UpdateInvoiceSettingsDto[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-400">Loading settings...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col gap-3">
        <div className="h-10 w-10 flex items-center justify-center rounded-full bg-green-500/20 border border-green-400/40">
          <Receipt className="h-5 w-5 text-green-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white">Invoice Settings</h1>
          <p className="text-sm text-gray-400">
            Customize the appearance and layout of your sales invoices and receipts.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Page Settings */}
          <Card className="glass-card border border-white/10">
            <CardHeader>
              <CardTitle className="text-xl text-white">Page Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pageSize" className="text-gray-200">
                    Page Size
                  </Label>
                  <Select
                    value={formData.pageSize || 'A4'}
                    onValueChange={(value) => updateField('pageSize', value)}
                  >
                    <SelectTrigger className="bg-white/10 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A4">A4</SelectItem>
                      <SelectItem value="A5">A5</SelectItem>
                      <SelectItem value="A6">A6</SelectItem>
                      <SelectItem value="CUSTOM">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pageOrientation" className="text-gray-200">
                    Orientation
                  </Label>
                  <Select
                    value={formData.pageOrientation || 'portrait'}
                    onValueChange={(value) => updateField('pageOrientation', value)}
                  >
                    <SelectTrigger className="bg-white/10 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portrait">Portrait</SelectItem>
                      <SelectItem value="landscape">Landscape</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(formData.pageSize === 'CUSTOM' || settings?.pageSize === 'CUSTOM') && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="customPageWidth" className="text-gray-200">
                        Custom Width (mm)
                      </Label>
                      <Input
                        id="customPageWidth"
                        type="number"
                        min={50}
                        max={1000}
                        value={formData.customPageWidth ?? ''}
                        onChange={(e) =>
                          updateField('customPageWidth', e.target.value ? Number(e.target.value) : null)
                        }
                        className="bg-white/10 border-white/10 text-white placeholder-gray-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customPageHeight" className="text-gray-200">
                        Custom Height (mm)
                      </Label>
                      <Input
                        id="customPageHeight"
                        type="number"
                        min={50}
                        max={1000}
                        value={formData.customPageHeight ?? ''}
                        onChange={(e) =>
                          updateField('customPageHeight', e.target.value ? Number(e.target.value) : null)
                        }
                        className="bg-white/10 border-white/10 text-white placeholder-gray-400"
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="margin" className="text-gray-200">
                    Margin (mm)
                  </Label>
                  <Input
                    id="margin"
                    type="number"
                    min={0}
                    max={50}
                    step={0.5}
                    value={formData.margin ?? 16}
                    onChange={(e) => updateField('margin', Number(e.target.value))}
                    className="bg-white/10 border-white/10 text-white placeholder-gray-400"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Header Settings */}
          <Card className="glass-card border border-white/10">
            <CardHeader>
              <CardTitle className="text-xl text-white">Header Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showLogo"
                  checked={formData.showLogo ?? false}
                  onCheckedChange={(checked) => updateField('showLogo', checked === true)}
                  className="border-white/20"
                />
                <Label htmlFor="showLogo" className="text-gray-200 cursor-pointer">
                  Show Logo
                </Label>
              </div>

              {formData.showLogo && (
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="logoSize" className="text-gray-200">
                      Logo Size (mm)
                    </Label>
                    <Input
                      id="logoSize"
                      type="number"
                      min={10}
                      max={200}
                      value={formData.logoSize ?? 50}
                      onChange={(e) => updateField('logoSize', Number(e.target.value))}
                      className="bg-white/10 border-white/10 text-white placeholder-gray-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logoPosition" className="text-gray-200">
                      Logo Position
                    </Label>
                    <Select
                      value={formData.logoPosition || 'center'}
                      onValueChange={(value) => updateField('logoPosition', value)}
                    >
                      <SelectTrigger className="bg-white/10 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">Left</SelectItem>
                        <SelectItem value="center">Center</SelectItem>
                        <SelectItem value="right">Right</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              <Separator className="bg-white/10" />

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="brandNameFontSize" className="text-gray-200">
                    Brand Name Font Size (pt)
                  </Label>
                  <Input
                    id="brandNameFontSize"
                    type="number"
                    min={8}
                    max={72}
                    value={formData.brandNameFontSize ?? 19}
                    onChange={(e) => updateField('brandNameFontSize', Number(e.target.value))}
                    className="bg-white/10 border-white/10 text-white placeholder-gray-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="brandNameColor" className="text-gray-200">
                    Brand Name Color
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="brandNameColor"
                      type="color"
                      value={formData.brandNameColor ?? '#111827'}
                      onChange={(e) => updateField('brandNameColor', e.target.value)}
                      className="h-10 w-20 bg-white/10 border-white/10"
                    />
                    <Input
                      type="text"
                      value={formData.brandNameColor ?? '#111827'}
                      onChange={(e) => updateField('brandNameColor', e.target.value)}
                      placeholder="#111827"
                      className="bg-white/10 border-white/10 text-white placeholder-gray-400"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="receiptTitle" className="text-gray-200">
                    Receipt Title
                  </Label>
                  <Input
                    id="receiptTitle"
                    type="text"
                    value={formData.receiptTitle ?? 'SALES RECEIPT'}
                    onChange={(e) => updateField('receiptTitle', e.target.value)}
                    className="bg-white/10 border-white/10 text-white placeholder-gray-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="receiptTitleFontSize" className="text-gray-200">
                    Receipt Title Font Size (pt)
                  </Label>
                  <Input
                    id="receiptTitleFontSize"
                    type="number"
                    min={6}
                    max={48}
                    value={formData.receiptTitleFontSize ?? 11}
                    onChange={(e) => updateField('receiptTitleFontSize', Number(e.target.value))}
                    className="bg-white/10 border-white/10 text-white placeholder-gray-400"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showLocationAddress"
                  checked={formData.showLocationAddress ?? true}
                  onCheckedChange={(checked) => updateField('showLocationAddress', checked === true)}
                  className="border-white/20"
                />
                <Label htmlFor="showLocationAddress" className="text-gray-200 cursor-pointer">
                  Show Location Address
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Content Settings */}
          <Card className="glass-card border border-white/10">
            <CardHeader>
              <CardTitle className="text-xl text-white">Content Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showCustomerInfo"
                  checked={formData.showCustomerInfo ?? true}
                  onCheckedChange={(checked) => updateField('showCustomerInfo', checked === true)}
                  className="border-white/20"
                />
                <Label htmlFor="showCustomerInfo" className="text-gray-200 cursor-pointer">
                  Show Customer Info
                </Label>
              </div>

              {formData.showCustomerInfo && (
                <div className="space-y-2">
                  <Label htmlFor="customerInfoFontSize" className="text-gray-200">
                    Customer Info Font Size (pt)
                  </Label>
                  <Input
                    id="customerInfoFontSize"
                    type="number"
                    min={6}
                    max={48}
                    value={formData.customerInfoFontSize ?? 11}
                    onChange={(e) => updateField('customerInfoFontSize', Number(e.target.value))}
                    className="bg-white/10 border-white/10 text-white placeholder-gray-400"
                  />
                </div>
              )}

              <Separator className="bg-white/10" />

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showItemsTable"
                  checked={formData.showItemsTable ?? true}
                  onCheckedChange={(checked) => updateField('showItemsTable', checked === true)}
                  className="border-white/20"
                />
                <Label htmlFor="showItemsTable" className="text-gray-200 cursor-pointer">
                  Show Items Table
                </Label>
              </div>

              {formData.showItemsTable && (
                <div className="space-y-2">
                  <Label htmlFor="itemsTableFontSize" className="text-gray-200">
                    Items Table Font Size (pt)
                  </Label>
                  <Input
                    id="itemsTableFontSize"
                    type="number"
                    min={6}
                    max={48}
                    value={formData.itemsTableFontSize ?? 9}
                    onChange={(e) => updateField('itemsTableFontSize', Number(e.target.value))}
                    className="bg-white/10 border-white/10 text-white placeholder-gray-400"
                  />
                </div>
              )}

              <Separator className="bg-white/10" />

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showPayments"
                  checked={formData.showPayments ?? true}
                  onCheckedChange={(checked) => updateField('showPayments', checked === true)}
                  className="border-white/20"
                />
                <Label htmlFor="showPayments" className="text-gray-200 cursor-pointer">
                  Show Payments
                </Label>
              </div>

              {formData.showPayments && (
                <div className="space-y-2">
                  <Label htmlFor="paymentsFontSize" className="text-gray-200">
                    Payments Font Size (pt)
                  </Label>
                  <Input
                    id="paymentsFontSize"
                    type="number"
                    min={6}
                    max={48}
                    value={formData.paymentsFontSize ?? 9}
                    onChange={(e) => updateField('paymentsFontSize', Number(e.target.value))}
                    className="bg-white/10 border-white/10 text-white placeholder-gray-400"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Footer Settings */}
          <Card className="glass-card border border-white/10">
            <CardHeader>
              <CardTitle className="text-xl text-white">Footer Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="footerText" className="text-gray-200">
                  Footer Text
                </Label>
                <Input
                  id="footerText"
                  type="text"
                  value={formData.footerText ?? ''}
                  onChange={(e) => updateField('footerText', e.target.value || null)}
                  placeholder="Leave empty for default"
                  className="bg-white/10 border-white/10 text-white placeholder-gray-400"
                />
                <p className="text-xs text-gray-500">
                  Custom footer text. Leave empty to use default: "Developed by Malind Tech Limited"
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showFooter"
                  checked={formData.showFooter ?? true}
                  onCheckedChange={(checked) => updateField('showFooter', checked === true)}
                  className="border-white/20"
                />
                <Label htmlFor="showFooter" className="text-gray-200 cursor-pointer">
                  Show Footer
                </Label>
              </div>

              {formData.showFooter && (
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="footerFontSize" className="text-gray-200">
                      Footer Font Size (pt)
                    </Label>
                    <Input
                      id="footerFontSize"
                      type="number"
                      min={6}
                      max={48}
                      value={formData.footerFontSize ?? 8}
                      onChange={(e) => updateField('footerFontSize', Number(e.target.value))}
                      className="bg-white/10 border-white/10 text-white placeholder-gray-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="footerColor" className="text-gray-200">
                      Footer Color
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="footerColor"
                        type="color"
                        value={formData.footerColor ?? '#9ca3af'}
                        onChange={(e) => updateField('footerColor', e.target.value)}
                        className="h-10 w-20 bg-white/10 border-white/10"
                      />
                      <Input
                        type="text"
                        value={formData.footerColor ?? '#9ca3af'}
                        onChange={(e) => updateField('footerColor', e.target.value)}
                        placeholder="#9ca3af"
                        className="bg-white/10 border-white/10 text-white placeholder-gray-400"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Color Scheme */}
          <Card className="glass-card border border-white/10">
            <CardHeader>
              <CardTitle className="text-xl text-white">Color Scheme</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="dividerColor" className="text-gray-200">
                    Divider Color
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="dividerColor"
                      type="color"
                      value={formData.dividerColor ?? '#d1d5db'}
                      onChange={(e) => updateField('dividerColor', e.target.value)}
                      className="h-10 w-20 bg-white/10 border-white/10"
                    />
                    <Input
                      type="text"
                      value={formData.dividerColor ?? '#d1d5db'}
                      onChange={(e) => updateField('dividerColor', e.target.value)}
                      placeholder="#d1d5db"
                      className="bg-white/10 border-white/10 text-white placeholder-gray-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dividerStyle" className="text-gray-200">
                    Divider Style
                  </Label>
                  <Select
                    value={formData.dividerStyle || 'dashed'}
                    onValueChange={(value) => updateField('dividerStyle', value)}
                  >
                    <SelectTrigger className="bg-white/10 border-white/10 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="solid">Solid</SelectItem>
                      <SelectItem value="dashed">Dashed</SelectItem>
                      <SelectItem value="dotted">Dotted</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="textColor" className="text-gray-200">
                    Text Color
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="textColor"
                      type="color"
                      value={formData.textColor ?? '#111827'}
                      onChange={(e) => updateField('textColor', e.target.value)}
                      className="h-10 w-20 bg-white/10 border-white/10"
                    />
                    <Input
                      type="text"
                      value={formData.textColor ?? '#111827'}
                      onChange={(e) => updateField('textColor', e.target.value)}
                      placeholder="#111827"
                      className="bg-white/10 border-white/10 text-white placeholder-gray-400"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="backgroundColor" className="text-gray-200">
                    Background Color (Optional)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="backgroundColor"
                      type="color"
                      value={formData.backgroundColor ?? '#ffffff'}
                      onChange={(e) => updateField('backgroundColor', e.target.value || null)}
                      className="h-10 w-20 bg-white/10 border-white/10"
                    />
                    <Input
                      type="text"
                      value={formData.backgroundColor ?? ''}
                      onChange={(e) => updateField('backgroundColor', e.target.value || null)}
                      placeholder="Leave empty for white"
                      className="bg-white/10 border-white/10 text-white placeholder-gray-400"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Leave empty for white background
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Messages and Actions */}
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

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              disabled={updateSettings.isPending}
              className="border-white/20 text-gray-200"
            >
              Reset
            </Button>
            <Button
              type="submit"
              disabled={updateSettings.isPending}
              className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
            >
              {updateSettings.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}

