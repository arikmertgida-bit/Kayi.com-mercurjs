import { HttpTypes } from "@medusajs/types"

export interface Review {
  id: string
  rating: number
  customer_id: string
  customer_note: string
  created_at: string
  reference: string
}

export interface StoreVendor {
  id?: string
  name?: string
  phone?: string
  email?: string
  description?: string
  handle?: string
  photo?: string
  created_at?: string
  product?: HttpTypes.StoreProduct[]
  review?: Review | Review[]
  address_line?: string
  postal_code?: string
  city?: string
  country_code?: string
  tax_id?: string
  store_status?: "ACTIVE" | "SUSPENDED" | "INACTIVE"
  /** The Medusa Region ID this seller operates in. Sourced from /vendor/sellers/me. */
  region_id?: string
  /** Seller-defined metadata. `selected_region_ids` holds the IDs of regions the seller sells in. */
  metadata?: {
    selected_region_ids?: string[]
    [key: string]: unknown
  }
}

export interface TeamMemberProps {
  id: string
  seller_id: string
  name: string
  email?: string
  photo?: string
  bio?: string
  phone?: string
  role: string
}
