"use server"

import { FollowedSeller, SellerProps } from "@/types/seller"
import { sdk } from "../config"
import { getAuthHeaders } from "./cookies"

const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

export const getSellerByHandle = async (handle: string) => {
  return sdk.client
    .fetch<{ seller: SellerProps }>(`/store/seller/${handle}`, {
      query: {
        fields:
          "+created_at,+email,+photo,+members.name,+members.photo,+members.role,+reviews.seller.name,+reviews.rating,+reviews.customer_note,+reviews.seller_note,+reviews.created_at,+reviews.updated_at,+reviews.customer.first_name,+reviews.customer.last_name,+reviews.reference,+reviews.reference_id",
      },
      next: { revalidate: 0 },
      cache: "no-store",
    })
    .then(({ seller }) => {
      const response = {
        ...seller,
        reviews:
          seller.reviews
            ?.filter((item) => item !== null)
            .sort((a, b) => b.created_at.localeCompare(a.created_at)) ?? [],
      }

      return response as SellerProps
    })
    .catch(() => [])
}

export const getFollowStatus = async (
  handle: string
): Promise<{ following: boolean; followers_count: number }> => {
  try {
    const authHeaders = await getAuthHeaders()
    const res = await fetch(
      `${BACKEND_URL}/store/sellers/${handle}/follow`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": PUBLISHABLE_KEY,
          ...(authHeaders as Record<string, string>),
        },
        next: { revalidate: 0 },
      }
    )
    if (!res.ok) return { following: false, followers_count: 0 }
    return res.json()
  } catch {
    return { following: false, followers_count: 0 }
  }
}

export const followSeller = async (
  handle: string
): Promise<{ following: boolean; followers_count: number }> => {
  const authHeaders = await getAuthHeaders()
  const res = await fetch(
    `${BACKEND_URL}/store/sellers/${handle}/follow`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
        ...(authHeaders as Record<string, string>),
      },
    }
  )
  if (!res.ok) throw new Error("Follow failed")
  return res.json()
}

export const unfollowSeller = async (
  handle: string
): Promise<{ following: boolean; followers_count: number }> => {
  const authHeaders = await getAuthHeaders()
  const res = await fetch(
    `${BACKEND_URL}/store/sellers/${handle}/follow`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
        ...(authHeaders as Record<string, string>),
      },
    }
  )
  if (!res.ok) throw new Error("Unfollow failed")
  return res.json()
}

export const getFollowedSellers = async (
  page: number = 1
): Promise<{ sellers: FollowedSeller[]; count: number }> => {
  try {
    const authHeaders = await getAuthHeaders()
    const limit = 20
    const offset = (page - 1) * limit
    const res = await fetch(
      `${BACKEND_URL}/store/sellers/following?limit=${limit}&offset=${offset}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": PUBLISHABLE_KEY,
          ...(authHeaders as Record<string, string>),
        },
        next: { revalidate: 0 },
      }
    )
    if (!res.ok) return { sellers: [], count: 0 }
    const data = await res.json()
    return { sellers: data.sellers || [], count: data.count || 0 }
  } catch {
    return { sellers: [], count: 0 }
  }
}

export const getSellerCategories = async (
  handle: string
): Promise<{ id: string; name: string; handle: string }[]> => {
  try {
    const res = await fetch(
      `${BACKEND_URL}/store/sellers/${handle}/categories`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": PUBLISHABLE_KEY,
        },
        next: { revalidate: 300 },
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.categories || []
  } catch {
    return []
  }
}
