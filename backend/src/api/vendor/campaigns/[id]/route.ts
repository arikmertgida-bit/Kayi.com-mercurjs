import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  IPromotionModuleService,
  Logger,
  UpdateCampaignDTO,
} from "@medusajs/types"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import sellerCampaign from "@mercurjs/b2c-core/links/seller-campaign"
import sellerPromotion from "@mercurjs/b2c-core/links/seller-promotion"
import {
  CampaignWithMeta,
  SellerWithMeta,
  buildMetaWithSeller,
  buildNamespacedIdentifier,
} from "../../../../lib/promotion-types.js"

type UpdateCampaignBody = {
  name?: string
  description?: string | null
  campaign_identifier?: string
  starts_at?: string | null
  ends_at?: string | null
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
    relations: [
      "promotions",
      "promotions.application_method",
      "promotions.application_method.target_rules",
      "promotions.application_method.target_rules.values",
    ],
  })

  return res.json({ campaign })
}

export const PUT = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await fetchSellerByAuthActorId(
    req.auth_context.actor_id,
    req.scope,
    ["id", "metadata"]
  ) as SellerWithMeta

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

  // Başlangıç tarihi geçmişte olamaz.
  if (body.starts_at && new Date(body.starts_at) < new Date()) {
    return res.status(400).json({ message: "Başlangıç tarihi geçmişte olamaz." })
  }

  const baseDto: UpdateCampaignDTO = { id }
  if (body.name !== undefined) baseDto.name = body.name
  if (body.description !== undefined) baseDto.description = body.description
  if (body.campaign_identifier !== undefined) {
    baseDto.campaign_identifier = buildNamespacedIdentifier(body.campaign_identifier, seller.id)
  }
  if (body.starts_at !== undefined) baseDto.starts_at = body.starts_at != null ? new Date(body.starts_at) : null
  if (body.ends_at !== undefined) baseDto.ends_at = body.ends_at != null ? new Date(body.ends_at) : null

  // Object.assign returns UpdateCampaignDTO & { metadata: ... }, which is a structural
  // subtype of UpdateCampaignDTO — no `as any` cast needed.
  const campaign = await promotionService.updateCampaigns(
    Object.assign(baseDto, { metadata: buildMetaWithSeller(body.metadata, seller.id, seller.metadata ?? null) })
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

  const remoteLink = req.scope.resolve(ContainerRegistrationKeys.REMOTE_LINK)
  const logger = req.scope.resolve<Logger>(ContainerRegistrationKeys.LOGGER)

  // Kampanyaya bağlı is_automatic:true promosyon ID'lerini şimdi çek.
  // Soft-delete sonrası campaign_id ile sorgulama güvenilir sonver olmayabilir.
  const embeddedPromos = await promotionService.listPromotions(
    { campaign_id: id, is_automatic: true } as Parameters<typeof promotionService.listPromotions>[0],
    { select: ["id"] }
  )
  const embeddedPromoIds = embeddedPromos.map((p) => p.id)

  // Inline Step/Compensate saga — garantili atomik silme:
  // Step 1: Entity soft-delete. Başarısız olursa link dokunulmaz → güvenli fırlatma.
  await promotionService.deleteCampaigns(id)

  // Step 2: Link kayıtlarını temizle.
  //   → seller_campaign link (kampanya)
  //   → seller_promotion link'leri (kampanyaya gömülü is_automatic:true promosyonlar)
  // Compensation: dismiss başarısız olursa soft-delete geri alınır (restoreCampaigns).
  try {
    const linkDismissList = [
      {
        seller: { seller_id: seller.id },
        [Modules.PROMOTION]: { campaign_id: id },
      },
      ...embeddedPromoIds.map((promoId) => ({
        seller: { seller_id: seller.id },
        [Modules.PROMOTION]: { promotion_id: promoId },
      })),
    ]
    await remoteLink.dismiss(linkDismissList)
  } catch (linkError) {
    try {
      await promotionService.restoreCampaigns(id)
      logger.warn(
        `[vendor/campaigns/delete] Compensated — campaign ${id} restored after link dismiss failure`
      )
    } catch (restoreError) {
      logger.warn(
        `[vendor/campaigns/delete] COMPENSATION FAILED: campaign ${id} stuck deleted — manual intervention required. linkError: ${String(linkError)} restoreError: ${String(restoreError)}`
      )
    }
    throw linkError
  }

  return res.status(200).json({ id, object: "campaign", deleted: true })
}
