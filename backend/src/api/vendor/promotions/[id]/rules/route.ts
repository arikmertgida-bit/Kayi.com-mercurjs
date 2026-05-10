import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService } from "@medusajs/types"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import { PromotionWithMeta, sellerOwnsPromotion } from "../../../shared/promotion-types.js"

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
    relations: ["rules"],
  }) as PromotionWithMeta

  if (!sellerOwnsPromotion(promotion, seller.id)) {
    return res.status(403).json({ message: "Bu promosyon size ait değil." })
  }

  return res.json({ rules: promotion.rules ?? [] })
}
