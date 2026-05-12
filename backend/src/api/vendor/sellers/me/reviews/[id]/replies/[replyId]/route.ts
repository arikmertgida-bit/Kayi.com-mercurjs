import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { REVIEW_REPLY_MODULE } from "../../../../../../../../modules/review-replies/index.js"
import ReviewReplyService from "../../../../../../../../modules/review-replies/service.js"
import { updateReviewWorkflow } from "@mercurjs/reviews/workflows"
import { resolveSeller } from "../../../../../../../utils/resolve-seller.js"

// PUT /vendor/sellers/me/reviews/:id/replies/:replyId — seller edits own reply
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const seller = await resolveSeller(req)
  if (!seller) return res.status(401).json({ message: "Yetkisiz erişim." })

  const { id: reviewId, replyId } = req.params
  const body = (req.body ?? {}) as Record<string, any>
  const content = typeof body.content === "string" ? body.content.trim() : ""

  if (!content || content.length > 500) {
    return res.status(400).json({ message: "Yanıt boş olamaz veya 500 karakteri geçemez." })
  }

  const replyService: ReviewReplyService = req.scope.resolve(REVIEW_REPLY_MODULE)
  const logger = req.scope.resolve<{ warn: (...a: unknown[]) => void }>('logger')

  // Verify ownership
  const [existing] = await replyService.listReviewReplies({ id: replyId, review_id: reviewId })
  if (!existing) return res.status(404).json({ message: "Yanıt bulunamadı." })
  if (existing.seller_id !== seller.id) return res.status(403).json({ message: "Bu yanıt size ait değil." })

  await replyService.updateReviewReplies({ id: replyId } as any, { content } as any)

  // Sync seller_note on the review so list shows "Replied"
  try {
    await updateReviewWorkflow.run({
      container: req.scope,
      input: { id: reviewId, seller_note: content },
    })
  } catch (err: any) {
    logger.warn("[vendor-reply-put] Could not sync seller_note:", err?.message)
  }

  return res.json({ reply: { ...existing, content } })
}

// DELETE /vendor/sellers/me/reviews/:id/replies/:replyId — seller deletes own reply
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const seller = await resolveSeller(req)
  if (!seller) return res.status(401).json({ message: "Yetkisiz erişim." })

  const { id: reviewId, replyId } = req.params
  const replyService: ReviewReplyService = req.scope.resolve(REVIEW_REPLY_MODULE)
  const logger = req.scope.resolve<{ warn: (...a: unknown[]) => void }>('logger')

  // Verify ownership
  const [existing] = await replyService.listReviewReplies({ id: replyId, review_id: reviewId })
  if (!existing) return res.status(404).json({ message: "Yanıt bulunamadı." })
  if (existing.seller_id !== seller.id) return res.status(403).json({ message: "Bu yanıt size ait değil." })

  await replyService.deleteReviewReplies(replyId)

  // Check if any seller replies remain — if not, clear seller_note
  const remaining = await replyService.listReviewReplies({ review_id: reviewId })
  const hasSellerReply = remaining.some((r: any) => r.seller_id)
  if (!hasSellerReply) {
    try {
      await updateReviewWorkflow.run({
        container: req.scope,
        input: { id: reviewId, seller_note: "" },
      })
    } catch (err: any) {
      logger.warn("[vendor-reply-delete] Could not clear seller_note:", err?.message)
    }
  }

  return res.json({ success: true })
}
