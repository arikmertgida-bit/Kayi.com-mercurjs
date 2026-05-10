import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService } from "@medusajs/types"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import {
  CampaignWithMeta,
  PromotionWithMeta,
  sellerOwnsCampaign,
  sellerOwnsPromotion,
} from "../../../shared/promotion-types.js"

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const actorId = (req as any).auth_context?.actor_id as string | undefined
  if (!actorId) {
    return res.status(401).json({ message: "Authentication required." })
  }

  const seller = await fetchSellerByAuthActorId(actorId, req.scope)

  const promotionService = req.scope.resolve<IPromotionModuleService>(
    Modules.PROMOTION
  )

  const { id } = req.params

  const campaign = await promotionService.retrieveCampaign(id) as CampaignWithMeta
  if (!sellerOwnsCampaign(campaign, seller.id)) {
    return res.status(403).json({ message: "Bu kampanya size ait değil." })
  }

  const body = req.body as { promotion_ids?: string[] }
  const promotionIds: string[] = body.promotion_ids ?? []

  for (const promotionId of promotionIds) {
    const promotion = await promotionService.retrievePromotion(promotionId) as PromotionWithMeta
    if (!sellerOwnsPromotion(promotion, seller.id)) {
      return res.status(403).json({ message: `${promotionId} promosyonu size ait değil.` })
    }
  }

  const result = await promotionService.addPromotionsToCampaign({
    id,
    promotion_ids: promotionIds,
  })

  return res.json(result)
}
