import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REVIEW_LIKE_MODULE } from "../../../../../modules/review-likes"
import ReviewLikeService from "../../../../../modules/review-likes/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Bu işlem için giriş yapmanız gerekiyor." })
  }

  const { id: reviewId } = req.params
  const likeService: ReviewLikeService = req.scope.resolve(REVIEW_LIKE_MODULE)

  const existing = await likeService.listReviewLikes({ review_id: reviewId, customer_id: customerId })

  if (existing.length > 0) {
    // Unlike
    await likeService.deleteReviewLikes(existing[0].id)
    const all = await likeService.listReviewLikes({ review_id: reviewId })
    return res.json({ liked: false, likes_count: all.length })
  } else {
    // Like
    await likeService.createReviewLikes({ review_id: reviewId, customer_id: customerId })
    const all = await likeService.listReviewLikes({ review_id: reviewId })
    return res.json({ liked: true, likes_count: all.length })
  }
}
