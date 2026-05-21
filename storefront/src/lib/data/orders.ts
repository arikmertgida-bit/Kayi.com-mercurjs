"use server"

import { SellerProps } from "@/types/seller"
import { sdk, PUBLISHABLE_API_KEY } from "../config"
import medusaError from "../helpers/medusa-error"
import { getAuthHeaders, getCacheOptions } from "./cookies"
import { HttpTypes } from "@medusajs/types"
import { OrderSetData } from "@/types/order-set"

// ─── Return Request Types ────────────────────────────────────────────────────
export type ReturnRequestLineItem = {
  line_item_id: string
  quantity: number
  reason_id?: string
  created_at: string
}

export type ReturnRequestOrderItem = {
  id: string
  thumbnail?: string | null
  product_title?: string
  title?: string
  unit_price: number
}

export type ReturnRequestOrder = {
  id: string
  display_id: string | number
  currency_code: string
  items: ReturnRequestOrderItem[]
  seller: SellerProps
}

export type ReturnRequest = {
  id: string
  status: string
  vendor_reviewer_note?: string
  line_items: ReturnRequestLineItem[]
  order: ReturnRequestOrder
}

export type ReturnReasonItem = {
  id: string
  label: string
}
// ────────────────────────────────────────────────────────────────────────────

export const retrieveOrderSet = async (id: string): Promise<OrderSetData | void> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  return sdk.client
    .fetch<{ order_set: OrderSetData }>(`/store/order-set/${id}`, {
      method: "GET",
      headers,
      cache: "no-cache",
    })
    .then(({ order_set }) => order_set)
    .catch((err) => medusaError(err))
}

export const retrieveOrder = async (id: string) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("orders")),
  }

  return sdk.client
    .fetch<HttpTypes.StoreOrderResponse & { seller: SellerProps }>(
      `/store/orders/${id}`,
      {
        method: "GET",
        query: {
          fields:
            "*payment_collections.payments,*items,*items.metadata,*items.variant,*items.product,*seller,*order_set,+seller.members.id,+seller.members.photo,+seller.members.role",
        },
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then(({ order }) => order)
    .catch((err) => medusaError(err))
}

export interface CreateReturnRequestInput {
  order_id: string
  customer_note?: string
  shipping_option_id: string | null
  line_items: Array<{
    line_item_id: string
    quantity: number
    reason_id: string
  }>
}

export const createReturnRequest = async (data: CreateReturnRequestInput) => {
  const headers = {
    ...(await getAuthHeaders()),
    "Content-Type": "application/json",
    "x-publishable-api-key": PUBLISHABLE_API_KEY,
  }

  const response = await fetch(
    `${process.env.MEDUSA_BACKEND_URL}/store/return-request`,
    {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    }
  )
    .then(async (res) => await res.json())
    .catch((err) => medusaError(err))

  return response
}

export const getReturns = async () => {
  const headers = await getAuthHeaders()

  return sdk.client
    .fetch<{
      order_return_requests: Array<ReturnRequest>
    }>(`/store/return-request`, {
      method: "GET",
      headers,
      cache: "force-cache",
      query: { fields: "*line_items.reason_id" },
    })
    .then((res) => res)
    .catch((err) => medusaError(err))
}

export const getReturnDetail = async (id: string) => {
  const headers = await getAuthHeaders()

  return sdk.client
    .fetch<{ order_return_request: ReturnRequest }>(`/store/return-request/${id}`, {
      method: "GET",
      headers,
      cache: "no-cache",
      query: { fields: "*line_items.*,*order.*,*order.items.*,vendor_reviewer_note" },
    })
    .then((res) => res.order_return_request)
    .catch(() => null)
}

export const getReturnShipment = async (returnRequestId: string) => {
  const headers = await getAuthHeaders()

  return sdk.client
    .fetch<{
      return_shipment: {
        phase: "awaiting_shipment" | "in_transit" | "received"
        tracking_number: string | null
        carrier: string | null
        shipped_at: string | null
        received_at: string | null
      } | null
    }>(`/store/return-request/${returnRequestId}/shipment`, {
      method: "GET",
      headers,
      cache: "no-cache",
    })
    .then((res) => res.return_shipment)
    .catch(() => null)
}

export const retriveReturnMethods = async (order_id: string) => {
  const headers = await getAuthHeaders()

  return sdk.client
    .fetch<{
      shipping_options: Array<HttpTypes.StoreShippingOption>
    }>(`/store/shipping-options/return?order_id=${order_id}`, {
      method: "GET",
      headers,
      cache: "no-cache",
    })
    .then(({ shipping_options }) => shipping_options)
    .catch(() => [])
}

export const listOrders = async (
  limit: number = 10,
  offset: number = 0,
  filters?: Record<string, string | number>
) => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("orders")),
  }

  return sdk.client
    .fetch<{
      orders: Array<
        HttpTypes.StoreOrder & {
          seller: { id: string; name: string }
          reviews: { id: string; reference_id: string; rating?: number }[]
        }
      >
    }>(`/store/orders`, {
      method: "GET",
      query: {
        limit,
        offset,
        order: "-created_at",
        fields:
          "*items,+items.metadata,*items.variant,*items.product,*seller,*reviews,*order_set,shipping_total,total,created_at",
        ...filters,
      },
      headers,
      next,
      cache: "no-cache",
    })
    .then(({ orders }) => orders)
    .catch((err) => medusaError(err))
}

export const createTransferRequest = async (
  state: {
    success: boolean
    error: string | null
    order: HttpTypes.StoreOrder | null
  },
  formData: FormData
): Promise<{
  success: boolean
  error: string | null
  order: HttpTypes.StoreOrder | null
}> => {
  const id = formData.get("order_id") as string

  if (!id) {
    return { success: false, error: "Order ID is required", order: null }
  }

  const headers = await getAuthHeaders()

  return await sdk.store.order
    .requestTransfer(
      id,
      {},
      {
        fields: "id, email",
      },
      headers
    )
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err: unknown) => ({ success: false, error: err instanceof Error ? err.message : String(err), order: null }))
}

export const acceptTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders()

  return await sdk.store.order
    .acceptTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err: unknown) => ({ success: false, error: err instanceof Error ? err.message : String(err), order: null }))
}

export const declineTransferRequest = async (id: string, token: string) => {
  const headers = await getAuthHeaders()

  return await sdk.store.order
    .declineTransfer(id, { token }, {}, headers)
    .then(({ order }) => ({ success: true, error: null, order }))
    .catch((err: unknown) => ({ success: false, error: err instanceof Error ? err.message : String(err), order: null }))
}

export const retrieveReturnReasons = async () => {
  const headers = await getAuthHeaders()

  return sdk.client
    .fetch<{
      return_reasons: Array<HttpTypes.StoreReturnReason>
    }>(`/store/return-reasons`, {
      method: "GET",
      headers,
      cache: "force-cache",
    })
    .then(({ return_reasons }) => return_reasons)
    .catch((err) => medusaError(err))
}
