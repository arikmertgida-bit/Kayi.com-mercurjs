import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { CreatePromotionDTO, IPromotionModuleService } from "@medusajs/types"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import sellerPromotion from "@mercurjs/b2c-core/links/seller-promotion"
import { buildMetaWithSeller } from "../shared/promotion-types.js"

/** Shape of a row returned from the seller_promotion link table. */
type SellerPromotionLinkRow = { promotion_id: string }

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const promotionService = req.scope.resolve<IPromotionModuleService>(Modules.PROMOTION)

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
  const offset = parseInt(req.query.offset as string) || 0

  // Query the seller_promotion link table — only rows belonging to this seller.
  // Pagination is applied here so we never scan the full promotions table.
  // deleted_at: { $eq: null } excludes soft-deleted link records.
  const { data, metadata } = await query.graph({
    entity: sellerPromotion.entryPoint,
    fields: ["promotion_id"],
    filters: { seller_id: seller.id, deleted_at: { $eq: null } },
    pagination: { skip: offset, take: limit },
  })

  const count = typeof metadata?.count === "number" ? metadata.count : 0
  const promotionIds = (data as SellerPromotionLinkRow[]).map((r) => r.promotion_id)

  if (promotionIds.length === 0) {
    return res.json({ promotions: [], count, limit, offset })
  }

  const promotions = await promotionService.listPromotions(
    { id: promotionIds },
    { relations: ["application_method", "rules"] }
  )

  return res.json({ promotions, count, limit, offset })
}

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)
  const promotionService = req.scope.resolve<IPromotionModuleService>(Modules.PROMOTION)
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  // req.body is validated by MedusaJS route middleware to match CreatePromotionDTO shape.
  // Object.assign returns CreatePromotionDTO & { metadata: ... }, a structural subtype of
  // CreatePromotionDTO — no `as any` cast needed.
  const body = req.body as CreatePromotionDTO & { metadata?: unknown }

  const applicationMethod = body.application_method
  if (applicationMethod?.target_type === "shipping_methods") {
    return res.status(400).json({
      message: "Promotions targeting shipping methods are not supported for vendors.",
    })
  }

  const promotion = await promotionService.createPromotions(
    Object.assign({} as CreatePromotionDTO, body, {
      metadata: buildMetaWithSeller(body.metadata, seller.id),
    })
  )

  // Register the seller ↔ promotion link so future GET queries use the link table.
  await remoteLink.create([
    {
      seller: { seller_id: seller.id },
      [Modules.PROMOTION]: { promotion_id: promotion.id },
    },
  ])

  return res.status(201).json({ promotion })
}
