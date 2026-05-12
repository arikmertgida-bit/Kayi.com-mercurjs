import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  CreatePromotionRuleDTO,
  IPromotionModuleService,
  UpdatePromotionRuleDTO,
} from "@medusajs/types"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import sellerPromotion from "@mercurjs/b2c-core/links/seller-promotion"

type BatchRulesBody = {
  create?: CreatePromotionRuleDTO[]
  update?: UpdatePromotionRuleDTO[]
  delete?: string[]
}

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)

  const promotionService = req.scope.resolve<IPromotionModuleService>(
    Modules.PROMOTION
  )

  const { id } = req.params

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: ownerLinks } = await query.graph({
    entity: sellerPromotion.entryPoint,
    fields: ["promotion_id"],
    filters: { seller_id: seller.id, promotion_id: id, deleted_at: { $eq: null } },
  })
  if (ownerLinks.length === 0) {
    return res.status(403).json({ message: "Bu promosyon size ait değil." })
  }

  const body = req.body as BatchRulesBody

  const created = body.create?.length
    ? await promotionService.addPromotionBuyRules(id, body.create)
    : []

  const updated = body.update?.length
    ? await promotionService.updatePromotionRules(body.update)
    : []

  if (body.delete?.length) {
    await promotionService.removePromotionBuyRules(id, body.delete)
  }

  return res.json({ created, updated, deleted: body.delete ?? [] })
}
