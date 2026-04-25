"use server"
import { getAuthHeaders } from "./cookies"

export const likeReview = async (
  reviewId: string
): Promise<{ liked: boolean; likes_count: number; error?: string }> => {
  const headers = {
    ...(await getAuthHeaders()),
    "Content-Type": "application/json",
    "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
  }

  const response = await fetch(
    `${process.env.MEDUSA_BACKEND_URL}/store/reviews/${reviewId}/like`,
    { method: "POST", headers }
  )

  if (response.status === 401) return { liked: false, likes_count: 0, error: "auth" }
  if (!response.ok) return { liked: false, likes_count: 0, error: "failed" }

  return response.json()
}
