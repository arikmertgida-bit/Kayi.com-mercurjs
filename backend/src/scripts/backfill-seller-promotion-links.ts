import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService } from "@medusajs/types"
import sellerPromotion from "@mercurjs/b2c-core/links/seller-promotion"
import sellerCampaign from "@mercurjs/b2c-core/links/seller-campaign"
import { PromotionWithMeta, CampaignWithMeta } from "../api/vendor/shared/promotion-types.js"

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
      {},
      { skip: offset, take: BATCH }
    )) as PromotionWithMeta[]
    if (promotions.length === 0) break

    for (const promotion of promotions) {
      const sellerId = typeof promotion.metadata?.seller_id === "string"
        ? promotion.metadata.seller_id
        : null

      if (!sellerId) {
        logger.warn(
          `[backfill] promotion ${promotion.id} has no metadata.seller_id — skipping`
        )
        promotionsSkipped++
        continue
      }

      // Skip if the link already exists (idempotent)
      const { data: existing } = await query.graph({
        entity: sellerPromotion.entryPoint,
        fields: ["promotion_id"],
        filters: { seller_id: sellerId, promotion_id: promotion.id },
      })

      if ((existing as Array<unknown>).length > 0) continue

      await remoteLink.create([
        {
          seller: { seller_id: sellerId },
          [Modules.PROMOTION]: { promotion_id: promotion.id },
        },
      ])
      promotionsLinked++
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
      {},
      { skip: offset, take: BATCH }
    )) as CampaignWithMeta[]
    if (campaigns.length === 0) break

    for (const campaign of campaigns) {
      const sellerId = typeof campaign.metadata?.seller_id === "string"
        ? campaign.metadata.seller_id
        : null

      if (!sellerId) {
        logger.warn(
          `[backfill] campaign ${campaign.id} has no metadata.seller_id — skipping`
        )
        campaignsSkipped++
        continue
      }

      const { data: existing } = await query.graph({
        entity: sellerCampaign.entryPoint,
        fields: ["campaign_id"],
        filters: { seller_id: sellerId, campaign_id: campaign.id },
      })

      if ((existing as Array<unknown>).length > 0) continue

      await remoteLink.create([
        {
          seller: { seller_id: sellerId },
          [Modules.PROMOTION]: { campaign_id: campaign.id },
        },
      ])
      campaignsLinked++
    }

    offset += campaigns.length
    if (campaigns.length < BATCH) break
  }

  logger.info(
    `[backfill] Campaigns: ${campaignsLinked} links created, ${campaignsSkipped} skipped (no metadata.seller_id)`
  )

  logger.info("[backfill] Done.")
}
