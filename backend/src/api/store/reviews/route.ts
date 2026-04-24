import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"

const DEV_BYPASS_EMAIL = "cyclo@gmail.com"
const DEV_BYPASS_ORDER_ID = "__dev_bypass_order__"
const REVIEW_MODULE = "review"
const SELLER_MODULE = "seller"
const DEFAULT_FIELDS = [
  "id",
  "reference",
  "rating",
  "customer_note",
  "customer.first_name",
  "customer.last_name",
  "seller_note",
  "created_at",
  "updated_at",
]

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Bu işlem için giriş yapmanız gerekiyor." })
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const offset = Number(req.query.offset ?? 0)
  const limit = Math.min(Number(req.query.limit ?? 50), 100)

  const { data: reviews, metadata } = await query.graph({
    entity: "customer_review",
    fields: DEFAULT_FIELDS.map((field) => `review.${field}`),
    filters: { customer_id: customerId },
    pagination: { skip: offset, take: limit },
  })

  return res.json({
    reviews: reviews.map((relation: any) => relation.review),
    count: metadata?.count ?? reviews.length,
    offset,
    limit,
  })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Bu işlem için giriş yapmanız gerekiyor." })
  }

  const body = (req.body ?? {}) as Record<string, any>
  const orderId =
    typeof body.order_id === "string" &&
    body.order_id.trim() &&
    body.order_id !== DEV_BYPASS_ORDER_ID
      ? body.order_id
      : undefined
  const reference = body.reference
  const referenceId = body.reference_id
  const rating = body.rating
  const customerNote = body.customer_note ?? null

  if (reference !== "product" && reference !== "seller") {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "reference is invalid")
  }

  if (typeof referenceId !== "string" || !referenceId.trim()) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "reference_id is required")
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "rating is invalid")
  }

  if (customerNote !== null && (typeof customerNote !== "string" || customerNote.length > 300)) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "customer_note is invalid")
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: customers } = await query.graph({
    entity: "customer",
    fields: ["id", "email"],
    filters: { id: customerId },
  })

  const customer = customers?.[0] as { id: string; email?: string } | undefined
  const isDevBypass = customer?.email === DEV_BYPASS_EMAIL

  let validatedOrderId = orderId

  if (!validatedOrderId && !isDevBypass) {
    return res.status(400).json({ message: "Lütfen yorumlamak istediğiniz siparişi seçin." })
  }

  if (validatedOrderId) {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "customer_id", "status"],
      filters: { id: validatedOrderId },
    })

    const order = orders?.[0] as { id: string; customer_id: string; status: string } | undefined

    if (!order) {
      return res.status(404).json({ message: "Sipariş bulunamadı." })
    }

    if (order.customer_id !== customerId) {
      return res.status(403).json({ message: "Yalnızca kendi siparişlerinizi yorumlayabilirsiniz." })
    }

    if (!isDevBypass && order.status !== "completed") {
      return res.status(400).json({ message: "Yalnızca teslim alınan siparişler için yorum yapabilirsiniz." })
    }

    const { data: relations } = await query.graph({
      entity: "order_review",
      fields: ["review.reference", "review.product.id", "review.seller.id"],
      filters: { order_id: validatedOrderId },
    })

    const orderReviews = relations.map((relation: any) => relation.review)
    const alreadyExists = orderReviews.some(
      (review: any) => review.reference === reference && review[reference]?.id === referenceId
    )

    if (alreadyExists) {
      return res.status(400).json({ message: "Bu sipariş için daha önce yorum yaptınız." })
    }
  } else if (isDevBypass) {
    const { data: relations } = await query.graph({
      entity: "customer_review",
      fields: ["review.reference", "review.product.id", "review.seller.id"],
      filters: { customer_id: customerId },
    })

    const existingReviews = relations.map((relation: any) => relation.review)
    const alreadyExists = existingReviews.some(
      (review: any) => review.reference === reference && review[reference]?.id === referenceId
    )

    if (alreadyExists) {
      return res.status(400).json({ message: "Bu ürün için daha önce yorum yaptınız." })
    }
  }

  let linkedSellerId: string | undefined

  if (reference === "product") {
    const { data: products } = await query.graph({
      entity: "product",
      fields: ["id", "seller.id"],
      filters: { id: referenceId },
    })

    linkedSellerId = products?.[0]?.seller?.id
  }

  const reviewService = req.scope.resolve(REVIEW_MODULE) as any
  const link = req.scope.resolve(ContainerRegistrationKeys.LINK)

  const review = await reviewService.createReviews({
    reference,
    customer_id: customerId,
    rating,
    customer_note: customerNote,
    seller_note: null,
  })

  const links: Record<string, any>[] = [
    {
      [Modules.CUSTOMER]: { customer_id: customerId },
      [REVIEW_MODULE]: { review_id: review.id },
    },
    reference === "product"
      ? {
          [Modules.PRODUCT]: { product_id: referenceId },
          [REVIEW_MODULE]: { review_id: review.id },
        }
      : {
          [SELLER_MODULE]: { seller_id: referenceId },
          [REVIEW_MODULE]: { review_id: review.id },
        },
  ]

  if (linkedSellerId) {
    links.push({
      [SELLER_MODULE]: { seller_id: linkedSellerId },
      [REVIEW_MODULE]: { review_id: review.id },
    })
  }

  if (validatedOrderId) {
    links.push({
      [Modules.ORDER]: { order_id: validatedOrderId },
      [REVIEW_MODULE]: { review_id: review.id },
    })
  }

  await link.create(links)

  const { data } = await query.graph({
    entity: "review",
    fields: DEFAULT_FIELDS,
    filters: { id: review.id },
  })

  return res.status(201).json({ review: data[0] ?? review })
}