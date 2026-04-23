import { QueryClient } from "@tanstack/react-query"

export const MEDUSA_BACKEND_URL = __BACKEND_URL__ ?? "/"

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 90000,
      retry: (failureCount, error: any) => {
        // Never retry on auth/not-found errors
        const status = error?.status ?? error?.statusCode
        if (status === 401 || status === 403 || status === 404) return false
        return failureCount < 1
      },
    },
  },
})
