import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'

const INVOICE_SETTINGS_QUERY_KEY = ['invoice-settings'] as const

export interface InvoiceSettings {
  id: string
  // Page Settings
  pageSize: string
  pageOrientation: string
  customPageWidth: number | null
  customPageHeight: number | null
  margin: number
  // Header Settings
  showLogo: boolean
  logoSize: number
  logoPosition: string
  brandNameFontSize: number
  brandNameColor: string
  receiptTitle: string
  receiptTitleFontSize: number
  showLocationAddress: boolean
  // Content Settings
  showCustomerInfo: boolean
  customerInfoFontSize: number
  showItemsTable: boolean
  itemsTableFontSize: number
  showPayments: boolean
  paymentsFontSize: number
  // Footer Settings
  footerText: string | null
  showFooter: boolean
  footerFontSize: number
  footerColor: string
  // Color Scheme
  dividerColor: string
  dividerStyle: string
  backgroundColor: string | null
  textColor: string
  createdAt: string
  updatedAt: string
}

export interface UpdateInvoiceSettingsDto {
  // Page Settings
  pageSize?: string
  pageOrientation?: string
  customPageWidth?: number | null
  customPageHeight?: number | null
  margin?: number
  // Header Settings
  showLogo?: boolean
  logoSize?: number
  logoPosition?: string
  brandNameFontSize?: number
  brandNameColor?: string
  receiptTitle?: string
  receiptTitleFontSize?: number
  showLocationAddress?: boolean
  // Content Settings
  showCustomerInfo?: boolean
  customerInfoFontSize?: number
  showItemsTable?: boolean
  itemsTableFontSize?: number
  showPayments?: boolean
  paymentsFontSize?: number
  // Footer Settings
  footerText?: string | null
  showFooter?: boolean
  footerFontSize?: number
  footerColor?: string
  // Color Scheme
  dividerColor?: string
  dividerStyle?: string
  backgroundColor?: string | null
  textColor?: string
}

const defaultSettings: InvoiceSettings = {
  id: '',
  // Page Settings
  pageSize: 'A4',
  pageOrientation: 'portrait',
  customPageWidth: null,
  customPageHeight: null,
  margin: 16,
  // Header Settings
  showLogo: false,
  logoSize: 50,
  logoPosition: 'center',
  brandNameFontSize: 19,
  brandNameColor: '#111827',
  receiptTitle: 'SALES RECEIPT',
  receiptTitleFontSize: 11,
  showLocationAddress: true,
  // Content Settings
  showCustomerInfo: true,
  customerInfoFontSize: 11,
  showItemsTable: true,
  itemsTableFontSize: 9,
  showPayments: true,
  paymentsFontSize: 9,
  // Footer Settings
  footerText: null,
  showFooter: true,
  footerFontSize: 8,
  footerColor: '#9ca3af',
  // Color Scheme
  dividerColor: '#d1d5db',
  dividerStyle: 'dashed',
  backgroundColor: null,
  textColor: '#111827',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

export function useInvoiceSettings() {
  return useQuery({
    queryKey: INVOICE_SETTINGS_QUERY_KEY,
    queryFn: async (): Promise<InvoiceSettings> => {
      const response = await apiClient.get<InvoiceSettings>('/invoice-settings')
      return response.data
    },
    staleTime: 0,
    placeholderData: () => defaultSettings,
  })
}

export function useUpdateInvoiceSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (updateDto: UpdateInvoiceSettingsDto): Promise<InvoiceSettings> => {
      const response = await apiClient.patch<InvoiceSettings>('/invoice-settings', updateDto)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(INVOICE_SETTINGS_QUERY_KEY, data)
      toast.success('Invoice settings updated successfully')
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || error?.message || 'Failed to update invoice settings'
      toast.error(Array.isArray(message) ? message[0] : message)
    },
  })
}

