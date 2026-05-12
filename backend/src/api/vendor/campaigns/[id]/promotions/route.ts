import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService } from "@medusajs/types"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import sellerCampaign from "@mercurjs/b2c-core/links/seller-campaign"
import sellerPromotion from "@mercurjs/b2c-core/links/seller-promotion"

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)

  const promotionService = req.scope.resolve<IPromotionModuleService>(
    Modules.PROMOTION
  )

  const { id } = req.params

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: campaignOwnerLinks } = await query.graph({
    entity: sellerCampaign.entryPoint,
    fields: ["campaign_id"],
    filters: { seller_id: seller.id, campaign_id: id, deleted_at: { $eq: null } },
  })
  if (campaignOwnerLinks.length === 0) {
    return res.status(403).json({ message: "Bu kampanya size ait değil." })
  }

  const body = req.body as { promotion_ids?: string[] }
  const promotionIds: string[] = body.promotion_ids ?? []

  for (const promotionId of promotionIds) {
    const { data: promotionOwnerLinks } = await query.graph({
      entity: sellerPromotion.entryPoint,
      fields: ["promotion_id"],
      filters: { seller_id: seller.id, promotion_id: promotionId, deleted_at: { $eq: null } },
    })
    if (promotionOwnerLinks.length === 0) {
      return res.status(403).json({ message: `${promotionId} promosyönu size ait değil.` })
    }
  }

  const result = await promotionService.addPromotionsToCampaign({
    id,
    promotion_ids: promotionIds,
  })

  return res.json(result)
}
