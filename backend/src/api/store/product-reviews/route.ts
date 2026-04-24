import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils"
import { REVIEW_IMAGE_MODULE } from "../../../modules/review-images"
import ReviewImageService from "../../../modules/review-images/service"
import { REVIEW_LIKE_MODULE } from "../../../modules/review-likes"
import ReviewLikeService from "../../../modules/review-likes/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { product_id } = req.query as { product_id?: string }

  if (!product_id) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "product_id is required")
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: relations } = await query.graph({
    entity: "product_review",
    fields: [
      "review.id",
      "review.reference",
      "review.rating",
      "review.customer_note",
      "review.customer.first_name",
      "review.customer.last_name",
      "review.seller.id",
      "review.seller.name",
      "review.created_at",
      "review.updated_at",
    ],
    filters: { product_id },
  })

  const reviews = (relations || []).map((relation: any) => relation.review).filter(Boolean)

  const reviewImageService: ReviewImageService = req.scope.resolve(REVIEW_IMAGE_MODULE)
  const likeService: ReviewLikeService = req.scope.resolve(REVIEW_LIKE_MODULE)
  const customerId = (req as any).auth_context?.actor_id

  // Attach visible images + likes to each review
  const reviewsWithImages = await Promise.all(
    (reviews || []).map(async (review: any) => {
      try {
        const [images, allLikes] = await Promise.all([
          reviewImageService.listReviewImages({ review_id: review.id, is_hidden: false }),
          likeService.listReviewLikes({ review_id: review.id }),
        ])
        const likes_count = allLikes.length
        const is_liked_by_me = customerId
          ? allLikes.some((l: any) => l.customer_id === customerId)
          : false
        return { ...review, images, likes_count, is_liked_by_me }
      } catch {
        return { ...review, images: [], likes_count: 0, is_liked_by_me: false }
      }
    })
  )

  const count = reviewsWithImages.length
  const average_rating =
    count > 0
      ? reviewsWithImages.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / count
      : 0

  res.json({ reviews: reviewsWithImages, count, average_rating })
}
