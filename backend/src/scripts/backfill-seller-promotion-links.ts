import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService, FilterablePromotionProps, FilterableCampaignProps } from "@medusajs/types"
import sellerPromotion from "@mercurjs/b2c-core/links/seller-promotion"
import sellerCampaign from "@mercurjs/b2c-core/links/seller-campaign"
import { PromotionWithMeta, CampaignWithMeta } from "../api/vendor/shared/promotion-types.js"

/** Extends the MedusaJS filter type to include soft-delete filtering. */
type PromotionFilter = FilterablePromotionProps & { deleted_at?: unknown }

/** Extends the MedusaJS filter type to include soft-delete filtering. */
type CampaignFilter = FilterableCampaignProps & { deleted_at?: unknown }

/**
 * One-time backfill script: creates seller_promotion and seller_campaign link
 * records for every existing promotion/campaign that already has metadata.seller_id.
 *
 * Records without metadata.seller_id are skipped with a warning (not a crash).
 *
 * Run with:
 *   npx medusa exec src/scripts/backfill-seller-promotion-links.ts
 */
export default async function backfillSellerPromotionLinks({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const remoteLink = container.resolve(ContainerRegistrationKeys.REMOTE_LINK)
  const promotionService = container.resolve<IPromotionModuleService>(Modules.PROMOTION)

  logger.info("[backfill] Starting seller-promotion and seller-campaign link backfill…")

  // ── Promotions ───────────────────────────────────────────────────────────────

  const BATCH = 100
  let offset = 0
  let promotionsLinked = 0
  let promotionsSkipped = 0

  while (true) {
    const promotions = (await promotionService.listPromotions(
      { deleted_at: { $eq: null } } as PromotionFilter,
      { skip: offset, take: BATCH }
    )) as PromotionWithMeta[]
    if (promotions.length === 0) break

    // Collect seller IDs and promotion IDs in this batch
    const batchPromotionIds: string[] = []
    const sellerByPromoId = new Map<string, string>()

    for (const promotion of promotions) {
      const sellerId =
        typeof promotion.metadata?.seller_id === "string"
          ? promotion.metadata.seller_id
          : null

      if (!sellerId) {
        logger.warn(
          `[backfill] promotion ${promotion.id} has no metadata.seller_id — skipping`
        )
        promotionsSkipped++
        continue
      }

      batchPromotionIds.push(promotion.id)
      sellerByPromoId.set(promotion.id, sellerId)
    }

    if (batchPromotionIds.length > 0) {
      // Single query to check which links already exist for this entire batch
      const { data: existingLinks } = await query.graph({
        entity: sellerPromotion.entryPoint,
        fields: ["promotion_id"],
        filters: { promotion_id: batchPromotionIds },
      })

      const existingSet = new Set(
        (existingLinks as Array<{ promotion_id: string }>).map((l) => l.promotion_id)
      )

      // Build the list of links that need to be created
      const linksToCreate: Array<{
        seller: { seller_id: string }
        [key: string]: { promotion_id?: string; seller_id?: string }
      }> = []

      for (const promoId of batchPromotionIds) {
        if (existingSet.has(promoId)) continue
        const sellerId = sellerByPromoId.get(promoId)
        if (!sellerId) continue
        linksToCreate.push({
          seller: { seller_id: sellerId },
          [Modules.PROMOTION]: { promotion_id: promoId },
        })
      }

      // Batch create all missing links in a single call
      if (linksToCreate.length > 0) {
        await remoteLink.create(linksToCreate)
        promotionsLinked += linksToCreate.length
      }
    }

    offset += promotions.length
    if (promotions.length < BATCH) break
  }

  logger.info(
    `[backfill] Promotions: ${promotionsLinked} links created, ${promotionsSkipped} skipped (no metadata.seller_id)`
  )

  // ── Campaigns ────────────────────────────────────────────────────────────────

  offset = 0
  let campaignsLinked = 0
  let campaignsSkipped = 0

  while (true) {
    const campaigns = (await promotionService.listCampaigns(
      { deleted_at: { $eq: null } } as CampaignFilter,
      { skip: offset, take: BATCH }
    )) as CampaignWithMeta[]
    if (campaigns.length === 0) break

    // Collect seller IDs and campaign IDs in this batch
    const batchCampaignIds: string[] = []
    const sellerByCampaignId = new Map<string, string>()

    for (const campaign of campaigns) {
      const sellerId =
        typeof campaign.metadata?.seller_id === "string"
          ? campaign.metadata.seller_id
          : null

      if (!sellerId) {
        logger.warn(
          `[backfill] campaign ${campaign.id} has no metadata.seller_id — skipping`
        )
        campaignsSkipped++
        continue
      }

      batchCampaignIds.push(campaign.id)
      sellerByCampaignId.set(campaign.id, sellerId)
    }

    if (batchCampaignIds.length > 0) {
      // Single query to check which links already exist for this entire batch
      const { data: existingLinks } = await query.graph({
        entity: sellerCampaign.entryPoint,
        fields: ["campaign_id"],
        filters: { campaign_id: batchCampaignIds },
      })

      const existingSet = new Set(
        (existingLinks as Array<{ campaign_id: string }>).map((l) => l.campaign_id)
      )

      // Build the list of links that need to be created
      const linksToCreate: Array<{
        seller: { seller_id: string }
        [key: string]: { campaign_id?: string; seller_id?: string }
      }> = []

      for (const campaignId of batchCampaignIds) {
        if (existingSet.has(campaignId)) continue
        const sellerId = sellerByCampaignId.get(campaignId)
        if (!sellerId) continue
        linksToCreate.push({
          seller: { seller_id: sellerId },
          [Modules.PROMOTION]: { campaign_id: campaignId },
        })
      }

      // Batch create all missing links in a single call
      if (linksToCreate.length > 0) {
        await remoteLink.create(linksToCreate)
        campaignsLinked += linksToCreate.length
      }
    }

    offset += campaigns.length
    if (campaigns.length < BATCH) break
  }

  logger.info(
    `[backfill] Campaigns: ${campaignsLinked} links created, ${campaignsSkipped} skipped (no metadata.seller_id)`
  )

  logger.info("[backfill] Done.")
}
