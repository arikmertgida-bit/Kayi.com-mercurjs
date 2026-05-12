import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  CampaignBudgetTypeValues,
  IPromotionModuleService,
  UpdateCampaignDTO,
} from "@medusajs/types"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import sellerCampaign from "@mercurjs/b2c-core/links/seller-campaign"
import {
  CampaignWithMeta,
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

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)

  const promotionService = req.scope.resolve<IPromotionModuleService>(
    Modules.PROMOTION
  )

  const { id } = req.params

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: ownerLinks } = await query.graph({
    entity: sellerCampaign.entryPoint,
    fields: ["campaign_id"],
    filters: { seller_id: seller.id, campaign_id: id, deleted_at: { $eq: null } },
  })
  if (ownerLinks.length === 0) {
    return res.status(403).json({ message: "Bu kampanya size ait değil." })
  }

  const campaign = await promotionService.retrieveCampaign(id, {
    relations: ["budget", "promotions"],
  })

  return res.json({ campaign })
}

export const PUT = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)

  const promotionService = req.scope.resolve<IPromotionModuleService>(
    Modules.PROMOTION
  )

  const { id } = req.params

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: ownerLinks } = await query.graph({
    entity: sellerCampaign.entryPoint,
    fields: ["campaign_id"],
    filters: { seller_id: seller.id, campaign_id: id, deleted_at: { $eq: null } },
  })
  if (ownerLinks.length === 0) {
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

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)

  const promotionService = req.scope.resolve<IPromotionModuleService>(
    Modules.PROMOTION
  )

  const { id } = req.params

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: ownerLinks } = await query.graph({
    entity: sellerCampaign.entryPoint,
    fields: ["campaign_id"],
    filters: { seller_id: seller.id, campaign_id: id, deleted_at: { $eq: null } },
  })
  if (ownerLinks.length === 0) {
    return res.status(403).json({ message: "Bu kampanya size ait değil." })
  }

  // Dismiss the link record before deleting the entity so the link table
  // stays clean regardless of whether MedusaJS cascades the deletion.
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)
  await remoteLink.dismiss([
    {
      seller: { seller_id: seller.id },
      [Modules.PROMOTION]: { campaign_id: id },
    },
  ])

  await promotionService.deleteCampaigns(id)

  return res.status(200).json({ id, object: "campaign", deleted: true })
}
