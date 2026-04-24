import { Product } from "./product"

type SellerAddress = {
  address_line?: string
  city?: string
  country_code?: string
  postal_code?: string
}

export type SellerMember = {
  id: string
  name: string
  email?: string
  photo?: string
  role: string
}

export type SellerProps = SellerAddress & {
  id: string
  name: string
  handle: string
  description: string
  photo: string
  tax_id: string
  created_at: string
  reviews?: any[]
  products?: Product[]
  email?: string
  store_status?: "ACTIVE" | "SUSPENDED" | "INACTIVE"
  followers_count?: number
  rating_avg?: number
  rating_count?: number
  members?: SellerMember[]
}

export type FollowedSeller = {
  id: string
  name: string
  handle: string
  photo: string
  member_photo?: string
  followed_at: string
}
