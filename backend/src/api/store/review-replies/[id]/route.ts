import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { REVIEW_REPLY_MODULE } from "../../../../modules/review-replies"
import ReviewReplyService from "../../../../modules/review-replies/service"

const updateSchema = z.object({
  content: z.string().trim().min(1, "Yanıt boş olamaz.").max(500, "Yanıt en fazla 500 karakter olmalıdır."),
})

// PUT /store/review-replies/:id — customer edits their own reply
export async function PUT(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Bu işlem için giriş yapmanız gerekiyor." })
  }

  const { id: replyId } = req.params
  const replyService: ReviewReplyService = req.scope.resolve(REVIEW_REPLY_MODULE)

  const [reply] = await replyService.listReviewReplies({ id: replyId })

  if (!reply) {
    return res.status(404).json({ message: "Yanıt bulunamadı." })
  }

  if (reply.customer_id !== customerId) {
    return res.status(403).json({ message: "Yalnızca kendi yanıtlarınızı düzenleyebilirsiniz." })
  }

  if (reply.seller_id) {
    return res.status(400).json({ message: "Satıcı yanıtları düzenlenemez." })
  }

  const parsed = updateSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0].message })
  }

  await replyService.updateReviewReplies({ id: replyId }, { content: parsed.data.content })

  const [updated] = await replyService.listReviewReplies({ id: replyId })

  return res.json({ reply: updated })
}

// DELETE /store/review-replies/:id — customer deletes their own reply
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Bu işlem için giriş yapmanız gerekiyor." })
  }

  const { id: replyId } = req.params
  const replyService: ReviewReplyService = req.scope.resolve(REVIEW_REPLY_MODULE)

  const [reply] = await replyService.listReviewReplies({ id: replyId })

  if (!reply) {
    return res.status(404).json({ message: "Yanıt bulunamadı." })
  }

  if (reply.customer_id !== customerId) {
    return res.status(403).json({ message: "Yalnızca kendi yanıtlarınızı silebilirsiniz." })
  }

  if (reply.seller_id) {
    return res.status(400).json({ message: "Satıcı yanıtları silinemez." })
  }

  await replyService.deleteReviewReplies(replyId)

  return res.json({ success: true })
}
