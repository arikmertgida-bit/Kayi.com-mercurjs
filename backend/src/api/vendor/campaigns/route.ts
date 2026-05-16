import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService } from "@medusajs/types"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import sellerCampaign from "@mercurjs/b2c-core/links/seller-campaign"

type SellerCampaignLinkRow = { campaign_id: string }

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const promotionService = req.scope.resolve<IPromotionModuleService>(Modules.PROMOTION)

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)
  const offset = parseInt(req.query.offset as string) || 0

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
    { relations: [] }
  )

  return res.json({ campaigns, count, limit, offset })
}
