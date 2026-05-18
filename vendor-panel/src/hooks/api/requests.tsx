import { FetchError } from "@medusajs/js-sdk"
import { PaginatedResponse } from "@medusajs/types"
import {
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQuery,
  UseQueryOptions,
} from "@tanstack/react-query"
import { queryKeysFactory } from "../../lib/query-key-factory"
import { fetchQuery } from "../../lib/client"
import { queryClient } from "../../lib/query-client"

export interface ApprovedItem {
  line_item_id: string
  quantity: number
}

export interface ReturnLineItem {
  id: string
  line_item_id: string
  quantity: number
}

export interface OrderItemDetail {
  id: string
  variant_id: string | null
  product_title: string | null
  thumbnail: string | null
  unit_price: number
  currency_code: string
  quantity: number
  [key: string]: unknown
}

export interface OrderReturnRequest {
  id: string
  status: "pending" | "refunded" | "withdrawn" | "escalated" | "canceled"
  customer_note: string | null
  vendor_reviewer_note: string | null
  created_at: string
  updated_at: string
  line_items?: ReturnLineItem[]
  order?: {
    id: string
    display_id?: number
    currency_code?: string
    customer?: {
      id: string
      first_name?: string
      last_name?: string
      email?: string
    }
    items?: OrderItemDetail[]
  }
  [key: string]: unknown
}

export interface ReturnShipment {
  id: string
  order_return_request_id: string
  phase: "awaiting_shipment" | "in_transit" | "received"
  tracking_number: string | null
  carrier: string | null
  approved_by: string
  approved_at: string
  shipped_at: string | null
  received_at: string | null
  approved_items: ApprovedItem[] | null
  created_at: string
  updated_at: string
}

const REQUESTS_QUERY_KEY = "requests" as const
export const requestsQueryKeys = queryKeysFactory(REQUESTS_QUERY_KEY)

export const useRequest = (
  id: string,
  query?: { [key: string]: string | number },
  options?: Omit<
    UseQueryOptions<
      {
        request: any
      },
      FetchError,
      {
        request: any
      },
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: requestsQueryKeys.detail(id),
    queryFn: async () =>
      fetchQuery(`/vendor/requests/${id}`, {
        method: "GET",
        query: query as { [key: string]: string | number },
      }),
    ...options,
  })

  return { ...data, ...rest }
}

export const useRequests = (
  query?: Record<string, any>,
  options?: Omit<
    UseQueryOptions<
      PaginatedResponse<{
        requests: any
      }>,
      FetchError,
      PaginatedResponse<{
        requests: any
      }>,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: () =>
      fetchQuery("/vendor/requests", {
        method: "GET",
        query: query as { [key: string]: string | number },
      }),

    queryKey: [REQUESTS_QUERY_KEY, "list"],
    ...options,
  })

  return { ...data, ...rest }
}

export const useCreateVendorRequest = (
  options?: UseMutationOptions<any, FetchError, any>
) => {
  return useMutation({
    mutationFn: (payload) =>
      fetchQuery("/vendor/requests", {
        method: "POST",
        body: payload,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: [REQUESTS_QUERY_KEY, "list"],
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdateRequest = (
  id: string,
  options?: UseMutationOptions<any, FetchError, any>
) => {
  return useMutation({
    mutationFn: (payload) =>
      fetchQuery(`/vendor/requests/${id}`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: [REQUESTS_QUERY_KEY, "list"],
      })

      queryClient.invalidateQueries({
        queryKey: requestsQueryKeys.detail(id),
      })

      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdateOrderReturnRequest = (id: string) => {
  return useMutation({
    mutationFn: (payload: any) =>
      fetchQuery(`/vendor/return-request/${id}`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [REQUESTS_QUERY_KEY, "return-request", id],
      })

      queryClient.invalidateQueries({
        queryKey: [REQUESTS_QUERY_KEY, "return-requests"],
      })
    },
  })
}

export const useOrderReturnRequest = (
  id: string,
  options?: UseQueryOptions<any, FetchError, any>
) => {
  const { data, ...rest } = useQuery({
    queryKey: [REQUESTS_QUERY_KEY, "return-request", id],
    queryFn: () =>
      fetchQuery(`/vendor/return-request/${id}`, {
        method: "GET",
        query: { fields: "*order,*line_items,*order.items" },
      }),
    ...options,
  })

  return { ...data, ...rest }
}

export const useOrderReturnRequests = (
  query?: Record<string, any>,
  options?: Omit<
    UseQueryOptions<
      PaginatedResponse<{
        order_return_request: any
      }>,
      FetchError,
      PaginatedResponse<{
        order_return_request: any
      }>,
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryFn: () =>
      fetchQuery("/vendor/return-request", {
        method: "GET",
        query: {
          fields: "*order.customer,+created_at",
        },
      }),

    queryKey: [REQUESTS_QUERY_KEY, "return-requests"],
    ...options,
  })

  let processedData = data?.order_return_request

  if (query?.limit) {
    processedData = data?.order_return_request.slice(0, Number(query.limit))
  }

  if (query?.offset) {
    processedData = data?.order_return_request.slice(
      Number(query.offset),
      Number(query.offset) + Number(query.limit)
    )
  }

  return {
    order_return_request: processedData,
    count: data?.count || 0,
    ...rest,
  }
}

export const useReturnShipment = (
  returnRequestId: string,
  options?: Omit<
    UseQueryOptions<{ return_shipment: ReturnShipment }, FetchError, { return_shipment: ReturnShipment }, QueryKey>,
    "queryFn" | "queryKey"
  >
) => {
  const { data, ...rest } = useQuery({
    queryKey: [REQUESTS_QUERY_KEY, "return-request", returnRequestId, "shipment"],
    queryFn: () =>
      fetchQuery(`/vendor/return-request/${returnRequestId}/shipment`, {
        method: "GET",
      }),
    ...options,
  })

  return { return_shipment: data?.return_shipment, ...rest }
}

export interface ApproveReturnPayload {
  carrier?: string
  approved_items?: ApprovedItem[]
}

export const useApproveReturnRequest = (
  id: string,
  options?: UseMutationOptions<{ return_shipment: ReturnShipment }, FetchError, ApproveReturnPayload>
) => {
  return useMutation({
    mutationFn: (payload: ApproveReturnPayload) =>
      fetchQuery(`/vendor/return-request/${id}/approve`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: [REQUESTS_QUERY_KEY, "return-request", id],
      })
      queryClient.invalidateQueries({
        queryKey: [REQUESTS_QUERY_KEY, "return-request", id, "shipment"],
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useMarkShippedBack = (
  id: string,
  options?: UseMutationOptions<{ return_shipment: ReturnShipment }, FetchError, { tracking_number?: string }>
) => {
  return useMutation({
    mutationFn: (payload: { tracking_number?: string }) =>
      fetchQuery(`/vendor/return-request/${id}/mark-shipped`, {
        method: "POST",
        body: payload,
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: [REQUESTS_QUERY_KEY, "return-request", id, "shipment"],
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useMarkReturnReceived = (
  id: string,
  options?: UseMutationOptions<{ return_shipment: ReturnShipment }, FetchError, void>
) => {
  return useMutation({
    mutationFn: () =>
      fetchQuery(`/vendor/return-request/${id}/mark-received`, {
        method: "POST",
        body: {},
      }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: [REQUESTS_QUERY_KEY, "return-request", id, "shipment"],
      })
      queryClient.invalidateQueries({
        queryKey: [REQUESTS_QUERY_KEY, "return-requests"],
      })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
