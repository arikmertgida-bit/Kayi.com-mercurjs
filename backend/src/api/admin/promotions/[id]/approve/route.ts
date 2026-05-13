import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules, PromotionStatus } from "@medusajs/framework/utils"
import { IEventBusModuleService, IPromotionModuleService } from "@medusajs/types"
import { PromotionWithMeta } from "../../../../vendor/shared/promotion-types.js"

const SELLER_MODULE = "seller"

/**
 * Minimal interface for the auto-generated SellerModuleService.
 * MedusaService generates updateSellers for every registered seller model.
 * We extend the typed DTO with runtime metadata support via intersection.
 */
interface ISellerModuleServiceForMeta {
  updateSellers(
    data: Array<{ id: string; metadata?: Record<string, unknown> }>
  ): Promise<unknown[]>
}

type ApproveBody = {
  trust_level?: "standard" | "trusted"
}

/**
 * POST /admin/promotions/:id/approve
 *
 * Approves a pending vendor promotion by updating metadata.approval_status = "approved".
 * Optionally marks the seller as auto-publish trusted (trust_level: "trusted").
 *
 * Body: { trust_level?: "standard" | "trusted" }
 * Response: { promotion, message }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const actorId = (req as { auth_context?: { actor_id?: string } }).auth_context?.actor_id
  if (!actorId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const { id } = req.params
  const body = req.body as ApproveBody

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

  // Preserve existing metadata and set approval_status = "approved"
  const existingMeta =
    typeof promotion.metadata === "object" && promotion.metadata !== null
      ? promotion.metadata
      : {}

  const updatedMeta: Record<string, unknown> = {
    ...existingMeta,
    approval_status: "approved",
  }

  // Activate the promotion at the MedusaJS level so that computeActions()
  // and the checkout guard both agree on its eligibility.
  const updated = (await promotionService.updatePromotions(
    Object.assign({ id }, { status: PromotionStatus.ACTIVE, metadata: updatedMeta })
  )) as PromotionWithMeta

  // If trust_level: "trusted" is requested, flip the seller's auto_publish flag so
  // subsequent promotions from this seller are approved immediately.
  const sellerId =
    typeof promotion.metadata?.seller_id === "string"
      ? promotion.metadata.seller_id
      : null

  if (body?.trust_level === "trusted" && sellerId) {
    try {
      const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
      const sellerService = req.scope.resolve<ISellerModuleServiceForMeta>(SELLER_MODULE)

      // Read current seller metadata to avoid overwriting existing keys.
      // query.graph returns MercurJS Seller type which lacks a typed metadata field;
      // we bridge through unknown for a safe narrowing without as any.
      const { data: sellerRows } = await query.graph({
        entity: "seller",
        fields: ["id", "metadata"],
        filters: { id: sellerId },
      })

      const rawSeller = sellerRows[0] as unknown as { metadata?: Record<string, unknown> | null }
      const currentSellerMeta = rawSeller?.metadata ?? {}

      await sellerService.updateSellers([{
        id: sellerId,
        metadata: {
          ...currentSellerMeta,
          auto_publish_promotions: true,
          trust_level: "trusted",
        },
      }])

      logger.info(
        `[admin/promotions/approve] Seller ${sellerId} promoted to trusted — auto_publish enabled`
      )
    } catch (err: unknown) {
      // Non-fatal: log and continue — the promotion approval itself succeeded.
      logger.warn(
        `[admin/promotions/approve] Failed to update seller trust_level for ${sellerId}: ` +
          (err instanceof Error ? err.message : String(err))
      )
    }
  }

  logger.info(
    `[admin/promotions/approve] Promotion ${id} approved by admin ${actorId}`
  )

  // Emit event for downstream handlers (email notification subscriber)
  await eventBus.emit({
    name: "seller.promotion_approved",
    data: {
      promotion_id: id,
      seller_id: sellerId ?? "",
      promotion_code: promotion.code ?? "",
    },
  })

  return res.json({ promotion: updated, message: "Promosyon onaylandı." })
}
