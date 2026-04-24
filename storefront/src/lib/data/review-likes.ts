// Client-side only — no "use server"
export const likeReview = async (
  reviewId: string
): Promise<{ liked: boolean; likes_count: number }> => {
  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"
  const pubKey = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

  const response = await fetch(`${backendUrl}/store/reviews/${reviewId}/like`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": pubKey,
    },
  })

  if (!response.ok) {
    throw new Error("Failed to like review")
  }

  return response.json()
}
