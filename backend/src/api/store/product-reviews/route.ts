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
      "review.seller_note",
      "review.customer.first_name",
      "review.customer.last_name",
      "review.customer.metadata",
      "review.seller.id",
      "review.seller.name",
      "review.seller.handle",
      "review.seller.photo",
      "review.seller.members.role",
      "review.seller.members.photo",
      "review.created_at",
      "review.updated_at",
    ],
    filters: { product_id },
  })

  const reviews = (relations || []).map((relation: any) => relation.review).filter(Boolean)

  const reviewImageService: ReviewImageService = req.scope.resolve(REVIEW_IMAGE_MODULE)
  const likeService: ReviewLikeService = req.scope.resolve(REVIEW_LIKE_MODULE)
  const customerId = (req as any).auth_context?.actor_id

  // Batch fetch images and likes for all reviews in two queries (eliminates N+1)
  const reviewIds = reviews.map((r: any) => r.id).filter(Boolean)

  const [allImages, allLikes] = reviewIds.length > 0
    ? await Promise.all([
        reviewImageService.listReviewImages({ review_id: reviewIds, is_hidden: false }),
        likeService.listReviewLikes({ review_id: reviewIds }),
      ])
    : [[], []]

  const imagesByReview = (allImages as any[]).reduce((acc: Record<string, any[]>, img: any) => {
    acc[img.review_id] = acc[img.review_id] ?? []
    acc[img.review_id].push(img)
    return acc
  }, {})

  const likesByReview = (allLikes as any[]).reduce((acc: Record<string, any[]>, like: any) => {
    acc[like.review_id] = acc[like.review_id] ?? []
    acc[like.review_id].push(like)
    return acc
  }, {})

  // Attach visible images + likes to each review
  const reviewsWithImages = reviews.map((review: any) => {
    const images = imagesByReview[review.id] ?? []
    const reviewLikes = likesByReview[review.id] ?? []
    const likes_count = reviewLikes.length
    const is_liked_by_me = customerId
      ? reviewLikes.some((l: any) => l.customer_id === customerId)
      : false
    const avatar_url = (review.customer?.metadata as any)?.avatar_url ?? undefined
    const enrichedCustomer = review.customer
      ? { ...review.customer, avatar_url }
      : review.customer
    return { ...review, customer: enrichedCustomer, images, likes_count, is_liked_by_me }
  })

  const count = reviewsWithImages.length
  const average_rating =
    count > 0
      ? reviewsWithImages.reduce((sum: number, r: any) => sum + (r.rating || 0), 0) / count
      : 0

  res.json({ reviews: reviewsWithImages, count, average_rating })
}
