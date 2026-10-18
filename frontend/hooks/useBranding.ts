import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { toast } from 'react-hot-toast'
import { isDummyDataEnabled } from '@/lib/dummy-data'

const BRANDING_QUERY_KEY = ['tenant', 'branding'] as const

export interface BrandingResponse {
  name: string
  logoUrl?: string | null
  logoId?: string | null
  updatedAt?: string | null
}

const defaultBranding: BrandingResponse = {
  name: 'Malind Tech',
  logoUrl: '/images/logo.png',
  logoId: null,
  updatedAt: null,
}

const CLOUDINARY_TRANSFORM = 'c_pad,w_160,h_160,b_white,q_auto,f_auto'

function enhanceBranding(payload?: BrandingResponse | null): BrandingResponse {
  if (!payload) {
    return defaultBranding
  }

  return {
    ...defaultBranding,
    ...payload,
    logoUrl: transformLogoUrl(payload.logoUrl) ?? defaultBranding.logoUrl,
  }
}

function transformLogoUrl(url?: string | null): string | null {
  if (!url) {
    return null
  }

  if (!/^https?:\/\//i.test(url)) {
    return url
  }

  try {
    const parsed = new URL(url)

    if (!parsed.pathname.includes('/upload/')) {
      return url
    }

    const segments = parsed.pathname.split('/')
    const uploadIndex = segments.findIndex((segment) => segment === 'upload')

    if (uploadIndex === -1) {
      return url
    }

    const transformSegment = CLOUDINARY_TRANSFORM
    const nextSegment = segments[uploadIndex + 1]

    if (nextSegment && nextSegment.includes('c_')) {
      segments[uploadIndex + 1] = transformSegment
    } else {
      segments.splice(uploadIndex + 1, 0, transformSegment)
    }

    parsed.pathname = segments.join('/')

    return parsed.toString()
  } catch (error) {
    console.warn('Failed to transform Cloudinary URL', error)
    return url
  }
}

export function useBranding() {
  return useQuery({
    queryKey: BRANDING_QUERY_KEY,
    queryFn: async (): Promise<BrandingResponse> => {
      // TEMPORARY: Check for auth bypass - return default branding without API call
      if (isDummyDataEnabled()) {
        return defaultBranding
      }
      
      try {
        const response = await apiClient.get('/auth/branding')
        // Responses are wrapped by the global interceptor as { success, message,
        // data }, and apiClient does NOT auto-unwrap — read the inner `data` or
        // the branding fields never land and we fall back to the default name/logo.
        const payload = (response.data?.data ?? response.data) as BrandingResponse
        return enhanceBranding(payload)
      } catch (error: any) {
        // If backend is unavailable, return default branding
        // Only log warning if bypass is not enabled (to avoid console spam)
        if (!isDummyDataEnabled()) {
          console.warn('Branding API unavailable, using default branding:', error?.message || 'Connection refused')
        }
        return defaultBranding
      }
    },
    staleTime: 0,
    placeholderData: () => defaultBranding,
    retry: false, // Don't retry if backend is down
    refetchOnWindowFocus: false, // Don't refetch on window focus
  })
}

type UpdateBrandingPayload = {
  brandingName?: string
  logoFile?: File
  deleteLogo?: boolean
}

export function useUpdateBranding() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ brandingName, logoFile, deleteLogo }: UpdateBrandingPayload) => {
      const formData = new FormData()

      if (brandingName !== undefined) {
        formData.append('brandingName', brandingName)
      }

      if (logoFile) {
        formData.append('logo', logoFile)
      }

      if (deleteLogo !== undefined) {
        formData.append('deleteLogo', deleteLogo.toString())
      }

      const response = await apiClient.patch('/auth/branding', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      // Unwrap the { data } envelope (see the query above) so the fresh name/logo
      // actually populate the cache instead of falling back to defaults.
      const payload = (response.data?.data ?? response.data) as BrandingResponse
      return enhanceBranding(payload)
    },
    onSuccess: (data) => {
      queryClient.setQueryData(BRANDING_QUERY_KEY, data)
      toast.success('Branding updated successfully')
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || error?.message || 'Failed to update branding'
      toast.error(Array.isArray(message) ? message[0] : message)
    },
  })
}

