import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import {
  CampaignBudgetTypeValues,
  CreateCampaignDTO,
  IPromotionModuleService,
} from "@medusajs/types"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import { buildMetaWithSeller, CampaignWithMeta } from "../shared/promotion-types.js"

type CreateCampaignBody = {
  name: string
  description?: string | null
  campaign_identifier: string
  starts_at?: string | null
  ends_at?: string | null
  budget?: {
    type?: CampaignBudgetTypeValues
    limit?: number | null
    currency_code?: string | null
  } | null
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

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
  const offset = parseInt(req.query.offset as string) || 0

  // MikroORM does not expose Campaign.metadata as a filterable mapped property,
  // so we cannot pass { metadata: { seller_id } } directly to listAndCountCampaigns.
  // Instead we fetch all campaigns and filter in memory by metadata.seller_id.
  const allCampaigns = (await promotionService.listCampaigns(
    {},
    { relations: ["budget", "promotions"] }
  )) as CampaignWithMeta[]

  const owned = allCampaigns.filter(
    (c) =>
      typeof c.metadata === "object" &&
      c.metadata !== null &&
      c.metadata["seller_id"] === seller.id
  )

  const count = owned.length
  const campaigns = owned.slice(offset, offset + limit)

  return res.json({ campaigns, count, limit, offset })
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

  const body = req.body as CreateCampaignBody

  const baseDto: CreateCampaignDTO = {
    name: body.name,
    campaign_identifier: body.campaign_identifier,
    description: body.description,
    starts_at: body.starts_at != null ? new Date(body.starts_at) : undefined,
    ends_at: body.ends_at != null ? new Date(body.ends_at) : undefined,
    budget: body.budget,
  }

  // Object.assign returns CreateCampaignDTO & { metadata: ... }, which is a structural
  // subtype of CreateCampaignDTO — no `as any` cast needed.
  const campaign = await promotionService.createCampaigns(
    Object.assign(baseDto, { metadata: buildMetaWithSeller(body.metadata, seller.id) })
  )

  return res.status(201).json({ campaign })
}
