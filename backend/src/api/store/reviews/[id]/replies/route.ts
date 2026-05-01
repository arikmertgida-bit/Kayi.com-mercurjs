import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { REVIEW_REPLY_MODULE } from "../../../../../modules/review-replies"
import ReviewReplyService from "../../../../../modules/review-replies/service"
import { notifyMessengerUser } from "../../../../../lib/messenger"
import { enrichRepliesWithCustomerData } from "../../../../utils/enrich-replies"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id: reviewId } = req.params
  const replyService: ReviewReplyService = req.scope.resolve(REVIEW_REPLY_MODULE)

  const replies = await replyService.listReviewReplies(
    { review_id: reviewId },
    { order: { created_at: "ASC" } }
  )

  const enriched = await enrichRepliesWithCustomerData(replies, req)

  return res.json({ replies: enriched, count: enriched.length })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Bu işlem için giriş yapmanız gerekiyor." })
  }

  const { id: reviewId } = req.params
  const body = (req.body ?? {}) as Record<string, any>
  const content = typeof body.content === "string" ? body.content.trim() : ""

  if (!content || content.length > 500) {
    return res.status(400).json({ message: "Yanıt en fazla 500 karakter olmalıdır." })
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
      customer = { first_name: customers[0].first_name || "", last_name: customers[0].last_name || "" }
    }
  } catch { /* non-critical */ }

  // Notify seller about the customer reply (fire-and-forget)
  query
    .graph({
      entity: "seller_review",
      fields: ["seller_id"],
      filters: { review_id: reviewId },
    })
    .then(({ data: relations }: { data: any[] }) => {
      const sellerId = relations?.[0]?.seller_id
      if (sellerId) {
        const customerName = `${customer.first_name} ${customer.last_name}`.trim() || "Müşteri"
        notifyMessengerUser({
          targetUserId: sellerId,
          targetUserType: "SELLER",
          senderName: customerName,
          preview: `${customerName} yorumunuza yorum ekledi.`,
          sourceUserId: customerId,
          sourceUserType: "CUSTOMER",
          subject: "Yorum Yanıtı Bildirimi",
          notificationType: "review_notification",
        })
      }
    })
    .catch(() => { /* non-critical */ })

  return res.json({ reply: { ...reply, customer } })
}
