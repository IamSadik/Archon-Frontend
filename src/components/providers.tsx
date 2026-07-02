'use client'

import * as React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
// import { type ThemeProviderProps } from 'next-themes/dist/types' 
import { Toaster } from 'react-hot-toast'
import { BackendWarmup } from '@/components/backend-warmup'

// Use explicit type or any to avoid the module not found error
type ThemeProviderProps = React.ComponentProps<typeof NextThemesProvider>

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}

export function Providers({ children, themeProps }: { children: React.ReactNode, themeProps?: ThemeProviderProps }) {
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        retry: (failureCount, error) => {
          const status = (error as { response?: { status?: number } })?.response?.status
          if (status === 502 || status === 503 || status === 504) {
            return failureCount < 4
          }
          return failureCount < 1
        },
        retryDelay: (attempt) => Math.min(attempt * 2000, 8000),
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider {...themeProps}>
        <BackendWarmup />
        {children}
        <Toaster position="bottom-right" />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
