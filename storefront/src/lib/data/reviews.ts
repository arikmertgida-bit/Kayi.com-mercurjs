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

export type Review = {
  id: string
  seller: {
    id: string
    name: string
    photo: string
  }
  customer?: {
    first_name: string
    last_name: string
    avatar_url?: string
  }
  reference: string
  reference_id: string
  customer_note: string
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
      next: { revalidate: 60 },
    })
    const data = res as { reviews?: Review[]; count?: number; average_rating?: number }
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

const reportReviewImage = async (imageId: string, reason: string) => {
  const headers = {
    ...(await getAuthHeaders()),
    "Content-Type": "application/json",
    "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY as string,
  }

  const response = await fetch(
    `${process.env.MEDUSA_BACKEND_URL}/store/review-images/${imageId}/report`,
    {
      headers,
      method: "POST",
      body: JSON.stringify({ reason }),
    }
  )

  return response.json()
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

export { getReviews, createReview, getProductReviews, uploadReviewImages, reportReviewImage }

