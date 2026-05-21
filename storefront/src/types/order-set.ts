import { HttpTypes } from "@medusajs/types"
import type { SellerProps } from "@/types/seller"

/**
 * MercurJS order-set API response shape.
 * Endpoint: GET /store/order-set/:id
 * Source: @mercurjs/b2c-core — not exported from the package, defined here centrally.
 */
export type OrderSetOrder = HttpTypes.StoreOrder & {
  seller: SellerProps
  currency_code: string
}

export interface OrderSetData {
  id: string
  display_id: string
  created_at: string | Date
  total: number
  shipping_total: number
  currency_code: string
  orders: OrderSetOrder[]
}
