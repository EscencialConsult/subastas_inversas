import { QueryClient } from '@tanstack/react-query'

const DEFAULT_STALE_TIME_MS = 30_000
const DEFAULT_GC_TIME_MS = 5 * 60_000

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: DEFAULT_STALE_TIME_MS,
      gcTime: DEFAULT_GC_TIME_MS,
      retry: (failureCount, error) => {
        const status = typeof error === 'object' && error && 'status' in error ? Number(error.status) : 0
        if (status >= 400 && status < 500) return false
        return failureCount < 2
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
})

export function getErrorMessage(error: unknown, fallback = 'Ocurrio un error inesperado.'): string {
  return error instanceof Error ? error.message : fallback
}
