'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { useState } from 'react'
import { AuthProvider } from '@/contexts/auth-context'
import { CurrencyProvider } from '@/contexts/currency-context'
import { ConfirmProvider } from '@/components/ui/confirm-provider'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: 1,
      },
    },
  }))

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <CurrencyProvider>
          <ConfirmProvider>
            {children}
          </ConfirmProvider>
        </CurrencyProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            className: '',
            style: {
              zIndex: 100,
            },
          }}
          containerStyle={{
            zIndex: 100,
          }}
        />
      </QueryClientProvider>
    </AuthProvider>
  )
}
