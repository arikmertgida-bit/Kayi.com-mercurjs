import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  CampaignBudgetTypeValues,
  CreateCampaignDTO,
  IPromotionModuleService,
} from "@medusajs/types"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import sellerCampaign from "@mercurjs/b2c-core/links/seller-campaign"
import { buildMetaWithSeller } from "../shared/promotion-types.js"

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

/** Shape of a row returned from the seller_campaign link table. */
type SellerCampaignLinkRow = { campaign_id: string }

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const promotionService = req.scope.resolve<IPromotionModuleService>(Modules.PROMOTION)

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
  const offset = parseInt(req.query.offset as string) || 0

  // Query the seller_campaign link table — only rows belonging to this seller.
  // Pagination is applied here so we never scan the full campaigns table.
  // deleted_at: { $eq: null } excludes soft-deleted link records.
  const { data, metadata } = await query.graph({
    entity: sellerCampaign.entryPoint,
    fields: ["campaign_id"],
    filters: { seller_id: seller.id, deleted_at: { $eq: null } },
    pagination: { skip: offset, take: limit },
  })

  const count = typeof metadata?.count === "number" ? metadata.count : 0
  const campaignIds = (data as SellerCampaignLinkRow[]).map((r) => r.campaign_id)

  if (campaignIds.length === 0) {
    return res.json({ campaigns: [], count, limit, offset })
  }

  const campaigns = await promotionService.listCampaigns(
    { id: campaignIds },
    { relations: ["budget", "promotions"] }
  )

  return res.json({ campaigns, count, limit, offset })
}

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)
  const promotionService = req.scope.resolve<IPromotionModuleService>(Modules.PROMOTION)
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)

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

  // Register the seller ↔ campaign link so future GET queries use the link table.
  await remoteLink.create([
    {
      seller: { seller_id: seller.id },
      [Modules.PROMOTION]: { campaign_id: campaign.id },
    },
  ])

  return res.status(201).json({ campaign })
}
