import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { DEV_BYPASS_EMAIL, DEV_BYPASS_ORDER_ID } from "./store/reviews/constants"

// @mercurjs/reviews plugin module key — confirmed from node_modules/.medusa/server/src/modules/reviews/index.js
const REVIEW_MODULE_KEY = "review" as const

async function checkOpenAIModeration(text: string): Promise<{ flagged: boolean; category?: string }> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return { flagged: false }

  try {
    const response = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ input: text }),
    })

    if (!response.ok) return { flagged: false }

    const data = await response.json()
    const result = data.results?.[0]
    if (!result?.flagged) return { flagged: false }

    const flaggedCategories = Object.entries(result.categories as Record<string, boolean>)
      .filter(([, flagged]) => flagged)
      .map(([cat]) => cat)

    return { flagged: true, category: flaggedCategories[0] }
  } catch {
    return { flagged: false }
  }
}

export async function reviewValidationMiddleware(
  req: MedusaRequest,
  res: MedusaResponse,
  next: () => void
) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Bu işlem için giriş yapmanız gerekiyor." })
  }

  const body = req.body as Record<string, any>
  const rawOrderId = body?.order_id
  const orderId = rawOrderId === DEV_BYPASS_ORDER_ID ? undefined : rawOrderId
  const reference = body?.reference
  const referenceId = body?.reference_id

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "email"],
    filters: { id: customerId },
  })

  const customer = customers?.[0] as { email?: string } | undefined
  const isDevCustomer = customer?.email === DEV_BYPASS_EMAIL

  if (rawOrderId === DEV_BYPASS_ORDER_ID && !isDevCustomer) {
    return res.status(400).json({ message: "Lütfen yorumlamak istediğiniz siparişi seçin." })
  }

  if (!orderId && !isDevCustomer) {
    return res.status(400).json({ message: "Lütfen yorumlamak istediğiniz siparişi seçin." })
  }

  if (!orderId && isDevCustomer) {
    const customerNote = body?.customer_note
    if (customerNote && typeof customerNote === "string" && customerNote.trim()) {
      const moderation = await checkOpenAIModeration(customerNote)
      if (moderation.flagged) {
        return res.status(400).json({
          message: "Your review contains inappropriate content and could not be submitted.",
          category: moderation.category,
        })
      }
    }

    return next()
  }

  // Check order ownership + status
  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id", "status", "email"],
    filters: { id: orderId },
  })

  const order = orders?.[0]

  if (!order) {
    return res.status(404).json({ message: "Sipariş bulunamadı." })
  }

  if (order.customer_id !== customerId) {
    return res.status(403).json({ message: "Yalnızca kendi siparişlerinizi yorumlayabilirsiniz." })
  }

  // Dev exception: cyclo@gmail.com can review any order regardless of status
  const isDev = isDevCustomer
  if (!isDev && order.status !== "completed") {
    return res.status(400).json({ message: "Yalnızca teslim alınan siparişler için yorum yapabilirsiniz." })
  }

  // Duplicate check
  try {
    const reviewService = req.scope.resolve(REVIEW_MODULE_KEY) as any
    if (reviewService?.listReviews) {
      const existing = await reviewService.listReviews({
        order_id: orderId,
        ...(reference ? { reference } : {}),
        ...(referenceId ? { reference_id: referenceId } : {}),
      })
      if (existing?.length > 0) {
        return res.status(400).json({ message: "Bu sipariş için daha önce yorum yaptınız." })
      }
    }
  } catch {
    // skip
  }

  // OpenAI content moderation
  const customerNote = body?.customer_note
  if (customerNote && typeof customerNote === "string" && customerNote.trim()) {
    const moderation = await checkOpenAIModeration(customerNote)
    if (moderation.flagged) {
      return res.status(400).json({
        message: "Your review contains inappropriate content and could not be submitted.",
        category: moderation.category,
      })
    }
  }

  next()
}
