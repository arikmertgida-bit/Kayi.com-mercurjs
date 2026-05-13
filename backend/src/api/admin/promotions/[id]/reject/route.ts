import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules, PromotionStatus } from "@medusajs/framework/utils"
import { IEventBusModuleService, IPromotionModuleService } from "@medusajs/types"
import { z } from "zod"
import { PromotionWithMeta } from "../../../../vendor/shared/promotion-types.js"

const RejectBodySchema = z.object({
  reason: z.string().min(5).max(500),
})

/**
 * POST /admin/promotions/:id/reject
 *
 * Rejects a pending vendor promotion by updating metadata:
 *   - approval_status: "rejected"
 *   - rejection_reason: <reason>
 *
 * Also emits "seller.promotion_rejected" event for downstream notification handlers.
 *
 * Body: { reason: string } — required, min 5 chars, max 500 chars
 * Response: { promotion, message }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const actorId = (req as { auth_context?: { actor_id?: string } }).auth_context?.actor_id
  if (!actorId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const { id } = req.params

  // Validate request body with Zod
  const parseResult = RejectBodySchema.safeParse(req.body)
  if (!parseResult.success) {
    const message =
      parseResult.error.issues[0]?.message ?? "Geçersiz istek gövdesi."
    return res.status(400).json({ message })
  }
  const { reason } = parseResult.data

  const logger = req.scope.resolve<{
    info: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
  }>("logger")

  const promotionService = req.scope.resolve<IPromotionModuleService>(Modules.PROMOTION)
  const eventBus = req.scope.resolve<IEventBusModuleService>(Modules.EVENT_BUS)

  // Retrieve the promotion — 404 if not found
  let promotion: PromotionWithMeta
  try {
    promotion = (await promotionService.retrievePromotion(id)) as PromotionWithMeta
  } catch {
    return res.status(404).json({ message: "Promosyon bulunamadı." })
  }

  const sellerId =
    typeof promotion.metadata?.seller_id === "string"
      ? promotion.metadata.seller_id
      : null

  // Preserve existing metadata and set rejection fields
  const existingMeta =
    typeof promotion.metadata === "object" && promotion.metadata !== null
      ? promotion.metadata
      : {}

  const updatedMeta: Record<string, unknown> = {
    ...existingMeta,
    approval_status: "rejected",
    rejection_reason: reason,
  }

  // Deactivate the promotion at the MedusaJS level — ensures computeActions() and
  // the checkout guard both treat it as ineligible, not just metadata-rejected.
  const updated = (await promotionService.updatePromotions(
    Object.assign({ id }, { status: PromotionStatus.INACTIVE, metadata: updatedMeta })
  )) as PromotionWithMeta

  // Emit event for downstream handlers (e.g. resend email notification)
  await eventBus.emit({
    name: "seller.promotion_rejected",
    data: {
      promotion_id: id,
      seller_id: sellerId ?? "",
      reason,
    },
  })

  logger.info(
    `[admin/promotions/reject] Promotion ${id} rejected by admin ${actorId}, reason: ${reason}`
  )

  return res.json({ promotion: updated, message: "Promosyon reddedildi." })
}
