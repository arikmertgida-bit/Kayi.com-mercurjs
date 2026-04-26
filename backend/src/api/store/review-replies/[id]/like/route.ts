import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REVIEW_REPLY_MODULE } from "../../../../../modules/review-replies"
import ReviewReplyService from "../../../../../modules/review-replies/service"

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Bu işlem için giriş yapmanız gerekiyor." })
  }

  const { id: replyId } = req.params
  const replyService: ReviewReplyService = req.scope.resolve(REVIEW_REPLY_MODULE)

  const [reply] = await replyService.listReviewReplies({ id: replyId })

  if (!reply) {
    return res.status(404).json({ message: "Reply not found" })
  }

  const likedByIds: string[] = Array.isArray(reply.liked_by_ids) ? reply.liked_by_ids : []
  const alreadyLiked = likedByIds.includes(customerId)

  const newLikedByIds = alreadyLiked
    ? likedByIds.filter((id) => id !== customerId)
    : [...likedByIds, customerId]

  await replyService.updateReviewReplies(
    { id: replyId },
    { liked_by_ids: newLikedByIds, likes_count: newLikedByIds.length }
  )

  return res.json({ liked: !alreadyLiked, likes_count: newLikedByIds.length })
}

