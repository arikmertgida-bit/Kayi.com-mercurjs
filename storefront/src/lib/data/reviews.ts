"use server"
import { revalidatePath } from "next/cache"
import { fetchQuery } from "../config"
import { getAuthHeaders } from "./cookies"
import { HttpTypes } from "@medusajs/types"

export type ReviewImage = {
  id: string
  url: string
  is_hidden: boolean
}

export type ReviewReply = {
  id: string
  review_id: string
  customer_id: string | null
  customer: {
    first_name: string
    last_name: string
    avatar_url?: string
  } | null
  is_seller_reply?: boolean
  seller_id?: string | null
  seller_name?: string | null
  content: string
  created_at: string
  likes_count: number
  is_liked_by_me: boolean
}

export type Review = {
  id: string
  seller: {
    id: string
    name: string
    handle: string
    photo?: string
    members?: Array<{ role: string; photo?: string }>
  }
  customer?: {
    first_name: string
    last_name: string
    avatar_url?: string
  }
  reference: string
  reference_id: string
  customer_note: string
  seller_note?: string | null
  rating: number
  updated_at: string
  images?: ReviewImage[]
  likes_count?: number
  is_liked_by_me?: boolean
}

export type Order = HttpTypes.StoreOrder & {
  seller: { id: string; name: string; reviews?: any[] }
  reviews: any[]
}

const getReviews = async () => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const res = await fetchQuery("/store/reviews", {
    headers,
    method: "GET",
    query: { fields: "*seller,+customer.id,+order_id" },
  })

  return res
}

const getProductReviews = async (productId: string): Promise<{
  reviews: Review[]
  count: number
  average_rating: number
}> => {
  try {
    const res = await fetchQuery("/store/product-reviews", {
      method: "GET",
      query: { product_id: productId },
      cache: "no-store",
    })
    const data = (res.data ?? {}) as { reviews?: Review[]; count?: number; average_rating?: number }
    return {
      reviews: data.reviews ?? [],
      count: data.count ?? 0,
      average_rating: data.average_rating ?? 0,
    }
  } catch {
    return { reviews: [], count: 0, average_rating: 0 }
  }
}

const uploadReviewImages = async (reviewId: string, urls: string[]) => {
  const headers = {
    ...(await getAuthHeaders()),
    "Content-Type": "application/json",
    "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY as string,
  }

  const response = await fetch(`${process.env.MEDUSA_BACKEND_URL}/store/review-images`, {
    headers,
    method: "POST",
    body: JSON.stringify({ review_id: reviewId, urls }),
  })

  return response.json()
}

const reportReviewImage = async (imageId: string, reason: string): Promise<{ success?: boolean; error?: string }> => {
  try {
    const authHeaders = await getAuthHeaders()
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY as string,
      ...(authHeaders as Record<string, string>),
    }

    const response = await fetch(
      `${process.env.MEDUSA_BACKEND_URL}/store/review-images/${imageId}/report`,
      {
        headers,
        method: "POST",
        body: JSON.stringify({ reason }),
      }
    )

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      return { error: (err as any)?.message || "Bildirim gönderilemedi." }
    }

    return { success: true }
  } catch {
    return { error: "Bildirim gönderilemedi." }
  }
}

const createReview = async (review: any) => {
  const headers = {
    ...(await getAuthHeaders()),
    "Content-Type": "application/json",
    "x-publishable-api-key": process.env
      .NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY as string,
  }

  const response = await fetch(
    `${process.env.MEDUSA_BACKEND_URL}/store/reviews`,
    {
      headers,
      method: "POST",
      body: JSON.stringify(review),
    }
  ).then((res) => {
    revalidatePath("/user/reviews")
    revalidatePath("/user/reviews/written")
    return res
  })

  return response.json()
}

const getReviewReplies = async (reviewId: string): Promise<ReviewReply[]> => {
  try {
    const authHeaders = await getAuthHeaders()
    const res = await fetch(
      `${process.env.MEDUSA_BACKEND_URL}/store/review-replies?review_id=${reviewId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY as string,
          ...(authHeaders as Record<string, string>),
        },
        cache: "no-store",
      }
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.replies ?? []
  } catch {
    return []
  }
}

const createReviewReply = async (reviewId: string, content: string): Promise<{ reply?: ReviewReply; error?: string }> => {
  const authHeaders = await getAuthHeaders()
  if (!("authorization" in authHeaders)) {
    return { error: "auth" }
  }

  const headers = {
    ...authHeaders,
    "Content-Type": "application/json",
    "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY as string,
  }

  try {
    const res = await fetch(
      `${process.env.MEDUSA_BACKEND_URL}/store/review-replies`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ review_id: reviewId, content }),
      }
    )

    if (res.status === 401) return { error: "auth" }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { error: err?.message || "Yanıt gönderilemedi." }
    }

    const data = await res.json()
    return { reply: data.reply }
  } catch {
    return { error: "Yanıt gönderilemedi." }
  }
}

const likeReviewReply = async (replyId: string): Promise<{ liked: boolean; likes_count: number; error?: string }> => {
  const headers = {
    ...(await getAuthHeaders()),
    "Content-Type": "application/json",
    "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY as string,
  }

  const res = await fetch(
    `${process.env.MEDUSA_BACKEND_URL}/store/review-replies/${replyId}/like`,
    { method: "POST", headers }
  )

  if (res.status === 401) return { liked: false, likes_count: 0, error: "auth" }
  if (!res.ok) return { liked: false, likes_count: 0, error: "failed" }
  return res.json()
}

const updateReviewReply = async (replyId: string, content: string): Promise<{ reply?: ReviewReply; error?: string }> => {
  const authHeaders = await getAuthHeaders()
  if (!("authorization" in authHeaders)) {
    return { error: "auth" }
  }

  const headers = {
    ...authHeaders,
    "Content-Type": "application/json",
    "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY as string,
  }

  try {
    const res = await fetch(
      `${process.env.MEDUSA_BACKEND_URL}/store/review-replies/${replyId}`,
      {
        method: "PUT",
        headers,
        body: JSON.stringify({ content }),
      }
    )

    if (res.status === 401) return { error: "auth" }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { error: err?.message || "Yanıt güncellenemedi." }
    }

    const data = await res.json()
    return { reply: data.reply }
  } catch {
    return { error: "Yanıt güncellenemedi." }
  }
}

const deleteReviewReply = async (replyId: string): Promise<{ success?: boolean; error?: string }> => {
  const authHeaders = await getAuthHeaders()
  if (!("authorization" in authHeaders)) {
    return { error: "auth" }
  }

  const headers = {
    ...authHeaders,
    "Content-Type": "application/json",
    "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY as string,
  }

  try {
    const res = await fetch(
      `${process.env.MEDUSA_BACKEND_URL}/store/review-replies/${replyId}`,
      {
        method: "DELETE",
        headers,
      }
    )

    if (res.status === 401) return { error: "auth" }
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { error: err?.message || "Yanıt silinemedi." }
    }

    return { success: true }
  } catch {
    return { error: "Yanıt silinemedi." }
  }
}

export { getReviews, createReview, getProductReviews, uploadReviewImages, reportReviewImage, getReviewReplies, createReviewReply, likeReviewReply, updateReviewReply, deleteReviewReply }
export type { ReviewReply }

export const isAuthenticated = async (): Promise<boolean> => {
  const headers = await getAuthHeaders()
  return "authorization" in headers
}

