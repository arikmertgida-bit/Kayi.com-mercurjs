import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import {
  CreatePromotionRuleDTO,
  IPromotionModuleService,
  UpdatePromotionRuleDTO,
} from "@medusajs/types"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import { PromotionWithMeta, sellerOwnsPromotion } from "../../../../shared/promotion-types.js"

type BatchRulesBody = {
  create?: CreatePromotionRuleDTO[]
  update?: UpdatePromotionRuleDTO[]
  delete?: string[]
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

  const { id } = req.params

  const existing = await promotionService.retrievePromotion(id) as PromotionWithMeta
  if (!sellerOwnsPromotion(existing, seller.id)) {
    return res.status(403).json({ message: "Bu promosyon size ait değil." })
  }

  const body = req.body as BatchRulesBody

  const created = body.create?.length
    ? await promotionService.addPromotionTargetRules(id, body.create)
    : []

  const updated = body.update?.length
    ? await promotionService.updatePromotionRules(body.update)
    : []

  if (body.delete?.length) {
    await promotionService.removePromotionTargetRules(id, body.delete)
  }

  return res.json({ created, updated, deleted: body.delete ?? [] })
}
