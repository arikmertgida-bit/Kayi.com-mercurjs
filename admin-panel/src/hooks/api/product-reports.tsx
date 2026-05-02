import { sdk } from "@lib/client"
import { queryKeysFactory } from "@lib/query-key-factory"
import {
  type QueryKey,
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"

export interface ProductReport {
  id: string
  product_id: string
  customer_id: string
  customer_name?: string
  product_title?: string
  product_handle?: string | null
  product_thumbnail?: string | null
  product_status?: string | null
  seller_id?: string | null
  seller_name?: string | null
  seller_handle?: string | null
  reason: string
  comment: string
  status: "pending" | "resolved" | "dismissed"
  created_at: string
}

export const productReportsQueryKeys = queryKeysFactory("product-reports")

export const useProductReports = (
  query?: Record<string, string | number | undefined>,
  options?: Omit<
    UseQueryOptions<
      Record<string, unknown>,
      Error,
      { reports: ProductReport[]; count: number },
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...other } = useQuery({
    queryKey: productReportsQueryKeys.list(query),
    queryFn: () =>
      sdk.client.fetch<Record<string, unknown>>("/admin/product-reports", {
        method: "GET",
        query,
      }),
    ...options,
  })
  return { ...data, ...other }
}

export const useResolveProductReport = (
  options?: UseMutationOptions<{ success: boolean }, Error, { id: string }>
) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }) =>
      sdk.client.fetch(`/admin/product-reports/${id}/resolve`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productReportsQueryKeys.lists() })
    },
    ...options,
  })
}

export const useDismissProductReport = (
  options?: UseMutationOptions<{ success: boolean }, Error, { id: string }>
) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }) =>
      sdk.client.fetch(`/admin/product-reports/${id}/dismiss`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productReportsQueryKeys.lists() })
    },
    ...options,
  })
}

export const useRejectProductReport = (
  options?: UseMutationOptions<{ success: boolean }, Error, { id: string }>
) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }) =>
      sdk.client.fetch(`/admin/product-reports/${id}/reject`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productReportsQueryKeys.lists() })
    },
    ...options,
  })
}

export const useDeleteProductReport = (
  options?: UseMutationOptions<{ success: boolean }, Error, { id: string }>
) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id }) =>
      sdk.client.fetch(`/admin/product-reports/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productReportsQueryKeys.lists() })
    },
    ...options,
  })
}
