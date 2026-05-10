import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import {
  CampaignBudgetTypeValues,
  IPromotionModuleService,
  UpdateCampaignDTO,
} from "@medusajs/types"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import {
  CampaignWithMeta,
  sellerOwnsCampaign,
  buildMetaWithSeller,
} from "../../shared/promotion-types.js"

type UpdateCampaignBody = {
  name?: string
  description?: string | null
  campaign_identifier?: string
  starts_at?: string | null
  ends_at?: string | null
  budget?: {
    type?: CampaignBudgetTypeValues
    limit?: number | null
    currency_code?: string | null
  }
  metadata?: unknown
}

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

  const campaign = await promotionService.retrieveCampaign(id, {
    relations: ["budget", "promotions"],
  }) as CampaignWithMeta

  if (!sellerOwnsCampaign(campaign, seller.id)) {
    return res.status(403).json({ message: "Bu kampanya size ait değil." })
  }

  return res.json({ campaign })
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

  const existing = await promotionService.retrieveCampaign(id) as CampaignWithMeta
  if (!sellerOwnsCampaign(existing, seller.id)) {
    return res.status(403).json({ message: "Bu kampanya size ait değil." })
  }

  const body = req.body as UpdateCampaignBody

  const baseDto: UpdateCampaignDTO = { id }
  if (body.name !== undefined) baseDto.name = body.name
  if (body.description !== undefined) baseDto.description = body.description
  if (body.campaign_identifier !== undefined) baseDto.campaign_identifier = body.campaign_identifier
  if (body.starts_at !== undefined) baseDto.starts_at = body.starts_at != null ? new Date(body.starts_at) : null
  if (body.ends_at !== undefined) baseDto.ends_at = body.ends_at != null ? new Date(body.ends_at) : null
  if (body.budget !== undefined) baseDto.budget = body.budget

  // Object.assign returns UpdateCampaignDTO & { metadata: ... }, which is a structural
  // subtype of UpdateCampaignDTO — no `as any` cast needed.
  const campaign = await promotionService.updateCampaigns(
    Object.assign(baseDto, { metadata: buildMetaWithSeller(body.metadata, seller.id) })
  ) as CampaignWithMeta

  return res.json({ campaign })
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

  const existing = await promotionService.retrieveCampaign(id) as CampaignWithMeta
  if (!sellerOwnsCampaign(existing, seller.id)) {
    return res.status(403).json({ message: "Bu kampanya size ait değil." })
  }

  await promotionService.deleteCampaigns(id)

  return res.status(200).json({ id, object: "campaign", deleted: true })
}
