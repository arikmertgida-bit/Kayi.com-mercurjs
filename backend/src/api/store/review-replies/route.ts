import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { REVIEW_REPLY_MODULE } from "../../../modules/review-replies"
import ReviewReplyService from "../../../modules/review-replies/service"

// GET /store/review-replies?review_id=xxx  — public
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { review_id } = req.query as { review_id?: string }

  if (!review_id) {
    return res.status(400).json({ message: "review_id is required" })
  }

  const replyService: ReviewReplyService = req.scope.resolve(REVIEW_REPLY_MODULE)

  const replies = await replyService.listReviewReplies(
    { review_id },
    { order: { created_at: "ASC" } }
  )

  // Enrich with customer names
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const customerIds = [...new Set(replies.map((r: any) => r.customer_id).filter(Boolean))]

  let customerMap: Record<string, { first_name: string; last_name: string }> = {}

  if (customerIds.length > 0) {
    try {
      const { data: customers } = await query.graph({
        entity: "customer",
        fields: ["id", "first_name", "last_name", "metadata"],
        filters: { id: customerIds },
      })
      for (const c of customers as any[]) {
        customerMap[c.id] = {
          first_name: c.first_name || "",
          last_name: c.last_name || "",
          avatar_url: (c.metadata as any)?.avatar_url ?? undefined,
        }
      }
    } catch {
      // Non-critical — return replies without names
    }
  }

  const customerId = (req as any).auth_context?.actor_id
  const enriched = replies.map((r: any) => ({
    ...r,
    is_seller_reply: !!r.seller_id,
    customer: r.customer_id
      ? (customerMap[r.customer_id] ?? { first_name: "Kullanıcı", last_name: "" })
      : null,
    is_liked_by_me: customerId
      ? ((r.liked_by_ids as string[] | null) ?? []).includes(customerId)
      : false,
  }))

  return res.json({ replies: enriched, count: enriched.length })
}

// POST /store/review-replies  — requires auth
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Bu işlem için giriş yapmanız gerekiyor." })
  }

  const body = (req.body ?? {}) as Record<string, any>
  const reviewId = typeof body.review_id === "string" ? body.review_id.trim() : ""
  const content = typeof body.content === "string" ? body.content.trim() : ""

  if (!reviewId) {
    return res.status(400).json({ message: "review_id is required" })
  }

  if (!content || content.length > 300) {
    return res.status(400).json({ message: "Yanıt en fazla 300 karakter olmalıdır." })
  }

  const replyService: ReviewReplyService = req.scope.resolve(REVIEW_REPLY_MODULE)

  const reply = await replyService.createReviewReplies({
    review_id: reviewId,
    customer_id: customerId,
    content,
  })

  // Enrich with customer info
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  let customer = { first_name: "Kullanıcı", last_name: "" }
  try {
    const { data: customers } = await query.graph({
      entity: "customer",
      fields: ["id", "first_name", "last_name"],
      filters: { id: customerId },
    })
    if (customers?.[0]) {
      customer = {
        first_name: customers[0].first_name || "",
        last_name: customers[0].last_name || "",
      }
    }
  } catch { /* non-critical */ }

  return res.json({ reply: { ...reply, customer } })
}
