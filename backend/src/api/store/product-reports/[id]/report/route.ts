import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { z } from "zod"
import { PRODUCT_REPORT_MODULE } from "../../../../../modules/product-reports"
import ProductReportService from "../../../../../modules/product-reports/service"
import { notifyMessengerUser } from "../../../../../lib/messenger"

const GROUP_B_REASONS = new Set([
  "inaccurate_product_details",
  "counterfeit_trademark",
  "other",
])

const reportSchema = z.object({
  reason: z.enum([
    "inaccurate_product_details",
    "pricing_irregularities",
    "prohibited_item",
    "counterfeit_trademark",
    "incorrect_categorization",
    "inappropriate_media",
    "dmca_violation",
    "other",
  ]),
  comment: z.string().min(1, "Comment is required").max(1000, "Comment must be at most 1000 characters"),
})

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const customerId = (req as any).auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required." })
  }

  const productId = req.params.id

  const parsed = reportSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: parsed.error.errors[0].message })
  }

  const { reason, comment } = parsed.data

  const reportService: ProductReportService = req.scope.resolve(PRODUCT_REPORT_MODULE)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Duplicate report check
  const existing = await reportService.listProductReports({
    product_id: productId,
    customer_id: customerId,
  })
  if (existing.length > 0) {
    return res.status(409).json({ message: "You have already reported this product." })
  }

  // Group B: purchase verification required
  if (GROUP_B_REASONS.has(reason)) {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: ["id", "status"],
      filters: {
        customer_id: customerId,
        status: "completed",
      },
    })

    // Check if any completed order contains this product
    const orderIds = (orders as any[]).map((o: any) => o.id)
    let hasPurchased = false

    if (orderIds.length > 0) {
      const { data: lineItems } = await query.graph({
        entity: "order_line_item",
        fields: ["id", "product_id", "order_id"],
        filters: {
          order_id: orderIds,
          product_id: productId,
        },
      })
      hasPurchased = (lineItems as any[]).length > 0
    }

    if (!hasPurchased) {
      return res.status(403).json({
        message: "You can only report products you have purchased.",
      })
    }
  }

  await reportService.createProductReports({
    product_id: productId,
    customer_id: customerId,
    reason,
    comment,
    status: "pending",
  })

  // Fire-and-forget: notify customer via kayi-messenger
  notifyMessengerUser({
    targetUserId: customerId,
    targetUserType: "CUSTOMER",
    senderName: "Kayı.com",
    preview: "Raporunuz alındı. En kısa sürede incelenecektir.",
    sourceUserId: "admin-system",
    sourceUserType: "ADMIN",
    subject: "Rapor Onayı",
    conversationType: "ADMIN_SUPPORT",
    notificationType: "report_notification",
  })

  return res.status(201).json({ message: "Report submitted successfully." })
}
