import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  CampaignBudgetTypeValues,
  CreateCampaignDTO,
  IPromotionModuleService,
} from "@medusajs/types"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import sellerCampaign from "@mercurjs/b2c-core/links/seller-campaign"
import { SellerWithMeta, buildMetaWithSeller, buildNamespacedIdentifier } from "../shared/promotion-types.js"

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
    { relations: ["budget"] }
  )

  return res.json({ campaigns, count, limit, offset })
}

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope,
    ["id", "metadata"]
  ) as SellerWithMeta
  const promotionService = req.scope.resolve<IPromotionModuleService>(Modules.PROMOTION)
  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)

  const body = req.body as CreateCampaignBody

  // Adım 6: Satıcı kampanyalarında budget.limit zorunlu.
  if (!body.budget?.limit) {
    return res.status(400).json({
      message: "Satıcı kampanyaları için budget.limit zorunludur.",
    })
  }

  // Adım 7: Başlangıç tarihi geçmişte olamaz.
  if (body.starts_at && new Date(body.starts_at) < new Date()) {
    return res.status(400).json({ message: "Başlangıç tarihi geçmişte olamaz." })
  }

  const namespacedIdentifier = buildNamespacedIdentifier(body.campaign_identifier, seller.id)
  const baseDto: CreateCampaignDTO = {
    name: body.name,
    campaign_identifier: namespacedIdentifier,
    description: body.description,
    starts_at: body.starts_at != null ? new Date(body.starts_at) : undefined,
    ends_at: body.ends_at != null ? new Date(body.ends_at) : undefined,
    budget: body.budget,
  }

  // Object.assign returns CreateCampaignDTO & { metadata: ... }, which is a structural
  // subtype of CreateCampaignDTO — no `as any` cast needed.
  const campaign = await promotionService.createCampaigns(
    Object.assign(baseDto, { metadata: buildMetaWithSeller(body.metadata, seller.id, seller.metadata ?? null) })
  )

  // Adım 4: Atomicity — link başarısız olursa campaign'i temizle (orphan önleme).
  try {
    await remoteLink.create([
      {
        seller: { seller_id: seller.id },
        [Modules.PROMOTION]: { campaign_id: campaign.id },
      },
    ])
  } catch (linkError) {
    await promotionService.deleteCampaigns(campaign.id).catch(() => {})
    throw linkError
  }

  return res.status(201).json({ campaign })
}
