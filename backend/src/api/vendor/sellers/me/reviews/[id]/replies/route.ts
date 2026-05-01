import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { REVIEW_REPLY_MODULE } from "../../../../../../../modules/review-replies"
import ReviewReplyService from "../../../../../../../modules/review-replies/service"
import { enrichRepliesWithCustomerData } from "../../../../../../utils/enrich-replies"
// @ts-ignore — import workflow from mercurjs package
import { updateReviewWorkflow } from "@mercurjs/reviews/workflows"

// Helper: resolve seller from vendor auth
async function resolveSeller(req: MedusaRequest) {
  const actorId = (req as any).auth_context?.actor_id
  if (!actorId) return null
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "seller",
    filters: { members: { id: actorId } },
    fields: ["id", "name"],
  })
  return (data?.[0] as any) ?? null
}

// GET /vendor/sellers/me/reviews/:id/replies — seller sees all replies for a review
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const seller = await resolveSeller(req)
  if (!seller) return res.status(401).json({ message: "Unauthorized" })

  const { id: reviewId } = req.params
  const replyService: ReviewReplyService = req.scope.resolve(REVIEW_REPLY_MODULE)

  const replies = await replyService.listReviewReplies(
    { review_id: reviewId },
    { order: { created_at: "ASC" } }
  )

  const enriched = await enrichRepliesWithCustomerData(replies, req)

  return res.json({ replies: enriched, count: enriched.length })
}

// POST /vendor/sellers/me/reviews/:id/replies — seller posts a reply
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const seller = await resolveSeller(req)
  if (!seller) return res.status(401).json({ message: "Unauthorized" })

  const { id: reviewId } = req.params
  const body = (req.body ?? {}) as Record<string, any>
  const content = typeof body.content === "string" ? body.content.trim() : ""

  if (!content || content.length > 500) {
    return res.status(400).json({ message: "Yanıt en fazla 500 karakter olmalıdır." })
  }

  const replyService: ReviewReplyService = req.scope.resolve(REVIEW_REPLY_MODULE)

  const reply = await replyService.createReviewReplies({
    review_id: reviewId,
    customer_id: null,
    seller_id: seller.id,
    seller_name: seller.name,
    content,
  } as any)

  // Sync seller_note on the review so the list status shows "Replied"
  try {
    await updateReviewWorkflow.run({
      container: req.scope,
      input: { id: reviewId, seller_note: content },
    })
  } catch (err: any) {
    console.warn("[review-reply] Could not sync seller_note:", err?.message)
  }

  // Notify customer about the seller reply via event (fire-and-forget)
  const eventBus = req.scope.resolve(Modules.EVENT_BUS) as any
  eventBus
    .emit({
      eventName: "review_notification.seller_reply",
      body: { data: { reviewId, sellerId: seller.id, sellerName: seller.name ?? "Satıcı" } },
    })
    .catch((err: Error) => {
      console.warn("[review-reply] notification event emit failed:", err.message)
    })

  return res.status(201).json({
    reply: {
      ...reply,
      is_seller_reply: true,
      customer: null,
    },
  })
}
