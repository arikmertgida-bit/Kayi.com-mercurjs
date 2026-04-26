import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { REVIEW_REPLY_MODULE } from "../../../../../../../modules/review-replies"
import ReviewReplyService from "../../../../../../../modules/review-replies/service"
import { notifyMessengerUser } from "../../../../../../../lib/messenger"
import { enrichRepliesWithCustomerData } from "../../../../../../utils/enrich-replies"

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

  // Find the review's customer_id to send notification (fire-and-forget)
  const query2 = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  query2
    .graph({
      entity: "customer_review",
      fields: ["customer_id"],
      filters: { review_id: reviewId },
    })
    .then(({ data: relations }: { data: any[] }) => {
      const customerId = relations?.[0]?.customer_id
      if (customerId) {
        notifyMessengerUser({
          targetUserId: customerId,
          targetUserType: "CUSTOMER",
          senderName: seller.name ?? "Satıcı",
          preview: `${seller.name ?? "Satıcı"} yorumunuza yanıt verdi.`,
          sourceUserId: seller.id,
          sourceUserType: "SELLER",
          subject: "Yorum Yanıtı Bildirimi",
        })
      }
    })
    .catch((err: Error) => {
      console.warn("[review-reply] Could not resolve customer for notification:", err.message)
    })

  return res.status(201).json({
    reply: {
      ...reply,
      is_seller_reply: true,
      customer: null,
    },
  })
}
