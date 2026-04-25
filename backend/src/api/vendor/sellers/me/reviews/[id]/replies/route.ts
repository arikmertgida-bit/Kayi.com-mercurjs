import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { REVIEW_REPLY_MODULE } from "../../../../../../../modules/review-replies"
import ReviewReplyService from "../../../../../../../modules/review-replies/service"

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
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const replies = await replyService.listReviewReplies(
    { review_id: reviewId },
    { order: { created_at: "ASC" } }
  )

  // Enrich customer replies with customer names
  const customerIds = [
    ...new Set(
      (replies as any[])
        .filter((r: any) => r.customer_id)
        .map((r: any) => r.customer_id)
    ),
  ]
  let customerMap: Record<string, { first_name: string; last_name: string }> = {}
  if (customerIds.length > 0) {
    try {
      const { data: customers } = await query.graph({
        entity: "customer",
        fields: ["id", "first_name", "last_name"],
        filters: { id: customerIds },
      })
      for (const c of customers as any[]) {
        customerMap[c.id] = {
          first_name: c.first_name || "",
          last_name: c.last_name || "",
        }
      }
    } catch { /* non-critical */ }
  }

  const enriched = (replies as any[]).map((r: any) => ({
    ...r,
    is_seller_reply: !!r.seller_id,
    customer: r.customer_id
      ? (customerMap[r.customer_id] ?? { first_name: "Kullanıcı", last_name: "" })
      : null,
  }))

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

  return res.status(201).json({
    reply: {
      ...reply,
      is_seller_reply: true,
      customer: null,
    },
  })
}
