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

export interface ReviewImageReport {
  id: string
  review_image_id: string
  customer_id: string
  reason: string
  status: "pending" | "resolved"
  action_taken: "hidden" | "published" | null
  created_at: string
  image?: {
    id: string
    url: string
    is_hidden: boolean
    review_id: string
  }
}

export const reviewImageReportsQueryKeys = queryKeysFactory("review-image-reports")

export const useReviewImageReports = (
  query?: Record<string, string | number | undefined>,
  options?: Omit<
    UseQueryOptions<
      Record<string, unknown>,
      Error,
      { reports: ReviewImageReport[]; count: number },
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...other } = useQuery({
    queryKey: reviewImageReportsQueryKeys.list(query),
    queryFn: () =>
      sdk.client.fetch<Record<string, unknown>>("/admin/review-image-reports", {
        method: "GET",
        query,
      }),
    ...options,
  })
  return { ...data, ...other }
}

export const useResolveImageReport = (
  options?: UseMutationOptions<
    { success: boolean; action: string },
    Error,
    { id: string; action: "hide" | "publish" }
  >
) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action }) =>
      sdk.client.fetch(`/admin/review-image-reports/${id}/resolve`, {
        method: "POST",
        body: { action },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: reviewImageReportsQueryKeys.lists() })
    },
    ...options,
  })
}
