import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { CreatePromotionDTO, IPromotionModuleService } from "@medusajs/types"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import { buildMetaWithSeller, PromotionWithMeta } from "../shared/promotion-types.js"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const actorId = (req as any).auth_context?.actor_id as string | undefined
  if (!actorId) {
    return res.status(401).json({ message: "Authentication required." })
  }

  const seller = await fetchSellerByAuthActorId(actorId, req.scope)

  const promotionService = req.scope.resolve<IPromotionModuleService>(
    Modules.PROMOTION
  )

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
  const offset = parseInt(req.query.offset as string) || 0

  // MikroORM does not expose Promotion.metadata as a filterable mapped property,
  // so we cannot pass { metadata: { seller_id } } directly to listAndCountPromotions.
  // Instead we fetch all promotions and filter in memory by metadata.seller_id.
  const allPromotions = (await promotionService.listPromotions(
    {},
    { relations: ["application_method", "rules"] }
  )) as PromotionWithMeta[]

  const owned = allPromotions.filter(
    (p) =>
      typeof p.metadata === "object" &&
      p.metadata !== null &&
      p.metadata["seller_id"] === seller.id
  )

  const count = owned.length
  const promotions = owned.slice(offset, offset + limit)

  return res.json({ promotions, count, limit, offset })
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const actorId = (req as any).auth_context?.actor_id as string | undefined
  if (!actorId) {
    return res.status(401).json({ message: "Authentication required." })
  }

  const seller = await fetchSellerByAuthActorId(actorId, req.scope)

  const promotionService = req.scope.resolve<IPromotionModuleService>(
    Modules.PROMOTION
  )

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

  return res.status(201).json({ promotion })
}
