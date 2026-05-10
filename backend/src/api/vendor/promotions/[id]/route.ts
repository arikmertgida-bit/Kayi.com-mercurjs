import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService, UpdatePromotionDTO } from "@medusajs/types"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import {
  PromotionWithMeta,
  sellerOwnsPromotion,
  buildMetaWithSeller,
} from "../../shared/promotion-types.js"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const actorId = (req as any).auth_context?.actor_id as string | undefined
  if (!actorId) {
    return res.status(401).json({ message: "Authentication required." })
  }

  const seller = await fetchSellerByAuthActorId(actorId, req.scope)

  const promotionService = req.scope.resolve<IPromotionModuleService>(
    Modules.PROMOTION
  )

  const { id } = req.params

  const promotion = await promotionService.retrievePromotion(id, {
    relations: ["application_method", "rules", "campaign"],
  }) as PromotionWithMeta

  if (!sellerOwnsPromotion(promotion, seller.id)) {
    return res.status(403).json({ message: "Bu promosyon size ait değil." })
  }

  return res.json({ promotion })
}

export const PUT = async (req: MedusaRequest, res: MedusaResponse) => {
  const actorId = (req as any).auth_context?.actor_id as string | undefined
  if (!actorId) {
    return res.status(401).json({ message: "Authentication required." })
  }

  const seller = await fetchSellerByAuthActorId(actorId, req.scope)

  const promotionService = req.scope.resolve<IPromotionModuleService>(
    Modules.PROMOTION
  )

  const { id } = req.params

  const existing = await promotionService.retrievePromotion(id) as PromotionWithMeta
  if (!sellerOwnsPromotion(existing, seller.id)) {
    return res.status(403).json({ message: "Bu promosyon size ait değil." })
  }

  // req.body is validated by MedusaJS route middleware to match UpdatePromotionDTO shape.
  // Object.assign returns UpdatePromotionDTO & { metadata: ... }, a structural subtype of
  // UpdatePromotionDTO — no `as any` cast needed.
  const body = req.body as UpdatePromotionDTO & { metadata?: unknown }

  const applicationMethod = body.application_method
  if (applicationMethod?.target_type === "shipping_methods") {
    return res.status(400).json({
      message: "Promotions targeting shipping methods are not supported for vendors.",
    })
  }

  const promotion = await promotionService.updatePromotions(
    Object.assign({} as UpdatePromotionDTO, body, {
      id,
      metadata: buildMetaWithSeller(body.metadata, seller.id),
    })
  )

  return res.json({ promotion })
}

export const DELETE = async (req: MedusaRequest, res: MedusaResponse) => {
  const actorId = (req as any).auth_context?.actor_id as string | undefined
  if (!actorId) {
    return res.status(401).json({ message: "Authentication required." })
  }

  const seller = await fetchSellerByAuthActorId(actorId, req.scope)

  const promotionService = req.scope.resolve<IPromotionModuleService>(
    Modules.PROMOTION
  )

  const { id } = req.params

  const existing = await promotionService.retrievePromotion(id) as PromotionWithMeta
  if (!sellerOwnsPromotion(existing, seller.id)) {
    return res.status(403).json({ message: "Bu promosyon size ait değil." })
  }

  await promotionService.deletePromotions(id)

  return res.status(200).json({ id, object: "promotion", deleted: true })
}
