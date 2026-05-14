import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules, PromotionStatus } from "@medusajs/framework/utils"
import { IEventBusModuleService, IPromotionModuleService } from "@medusajs/types"
import sellerPromotion from "@mercurjs/b2c-core/links/seller-promotion"
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

  // Reject: set status to 'draft' (vendor convention: draft = rejected).
  // Also write rejection metadata directly via raw knex since the MedusaJS
  // promotion ORM entity does not have a metadata column — we added it manually.
  const knex = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const updated = (await promotionService.updatePromotions(
    { id, status: "draft" as typeof PromotionStatus.INACTIVE }
  )) as PromotionWithMeta

  // Raw SQL: write rejection metadata to the promotion.metadata jsonb column.
  await knex("promotion")
    .where({ id })
    .update({
      metadata: knex.raw(
        `COALESCE(metadata, '{}'::jsonb) || ?::jsonb`,
        [JSON.stringify({ approval_status: "rejected", rejection_reason: reason })]
      ),
    })

  // Resolve the owning seller_id from the seller_promotion link table.
  const linkQuery = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: linkRows } = await linkQuery.graph({
    entity: sellerPromotion.entryPoint,
    fields: ["seller_id"],
    filters: { promotion_id: id, deleted_at: { $eq: null } },
  })
  const sellerId =
    (linkRows[0] as { seller_id?: string } | undefined)?.seller_id ?? null

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
