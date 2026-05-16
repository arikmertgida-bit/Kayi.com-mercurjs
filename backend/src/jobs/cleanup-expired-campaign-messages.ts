import { MedusaContainer } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { deletePromotionMessages } from "../lib/messenger.js"

interface CampaignRow { id: string }

type Logger = {
  info: (...a: unknown[]) => void
  warn: (...a: unknown[]) => void
}

/** Shape of a promotion row returned from query.graph */
type PromotionGraphRow = { id: string }

/**
 * Saatlik temizlik işi — süresi dolmuş kampanyaların promosyon mesajlarını
 * kayi-messenger'dan siler.
 *
 * Çalışma mantığı:
 *  1. ends_at < NOW() olan kampanyaları bul
 *  2. Bu kampanyalara bağlı tüm promotion_id'leri al
 *  3. Her biri için deletePromotionMessages çağır (idempotent — tekrar çalışsa zarar vermez)
 *
 * Performans: fire-and-forget + non-blocking; arka planda çalışır,
 * istek döngüsünü hiç etkilemez.
 */
export default async function cleanupExpiredCampaignMessagesJob(
  container: MedusaContainer
) {
  const logger = container.resolve<Logger>("logger")
  const knex = container.resolve(ContainerRegistrationKeys.PG_CONNECTION)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  logger.info("[cleanup-expired] Starting expired campaign message cleanup")

  try {
    // ── 1a. Süresi dolmuş kampanyaları bul (ends_at < NOW()) ─────────────────
    const expiredByTime: CampaignRow[] = await knex("promotion_campaign")
      .select("id")
      .whereNotNull("ends_at")
      .where("ends_at", "<", knex.fn.now())
      .whereNull("deleted_at")

    // ── 1b. Bütçesi tükenmiş kampanyaları bul (used >= limit) ────────────────
    // budget-exhausted subscriber fire-and-forget ile mesajları siler;
    // başarısız olursa bu job backup olarak temizler (deletePromotionMessages idempotent).
    const exhaustedByBudget: CampaignRow[] = await knex("promotion_campaign")
      .select("promotion_campaign.id as id")
      .join(
        "promotion_campaign_budget",
        "promotion_campaign.id",
        "=",
        "promotion_campaign_budget.campaign_id"
      )
      .whereNull("promotion_campaign.deleted_at")
      .whereNotNull("promotion_campaign_budget.limit")
      .whereRaw("promotion_campaign_budget.used >= promotion_campaign_budget.limit")

    // Deduplicate — same campaign may appear in both lists
    const seen = new Set<string>()
    const allTargetCampaigns: CampaignRow[] = []
    for (const c of [...expiredByTime, ...exhaustedByBudget]) {
      if (!seen.has(c.id)) {
        seen.add(c.id)
        allTargetCampaigns.push(c)
      }
    }

    if (allTargetCampaigns.length === 0) {
      logger.info("[cleanup-expired] No expired or exhausted campaigns — nothing to clean")
      return
    }

    logger.info(
      `[cleanup-expired] Found ${allTargetCampaigns.length} campaign(s) to process ` +
        `(${expiredByTime.length} expired by time, ${exhaustedByBudget.length} exhausted by budget)`
    )

    const campaignIds = allTargetCampaigns.map((c) => c.id)

    // ── 2. Bu kampanyalara ait tüm promosyonları query.graph ile al ──────────
    // query.graph MedusaJS query abstraction'ı kullanır — raw SQL/knex
    // yerine çerçevenin kendi katmanını kullanmak domain bağımsızlığını korur.
    // campaign_id, promotion entity'sinin native bir sütunudur (FK).
    const { data: promoRows } = await query.graph({
      entity: "promotion",
      fields: ["id"],
      filters: { campaign_id: campaignIds },
    })
    const promotions = promoRows as PromotionGraphRow[]

    if (promotions.length === 0) {
      logger.info("[cleanup-expired] No promotions found for expired campaigns")
      return
    }

    logger.info(
      `[cleanup-expired] Deleting messenger messages for ${promotions.length} promotion(s)`
    )

    // ── 3. Her promosyon için mesajları sil (fire-and-forget, idempotent) ──
    let processed = 0
    for (const promo of promotions) {
      try {
        await deletePromotionMessages(promo.id)
        processed++
      } catch (err: unknown) {
        logger.warn(
          `[cleanup-expired] Failed to delete messages for promotion ${promo.id}: ` +
            (err instanceof Error ? err.message : String(err))
        )
      }
    }

    logger.info(
      `[cleanup-expired] Done — processed ${processed}/${promotions.length} promotion(s)`
    )
  } catch (err: unknown) {
    logger.warn(
      "[cleanup-expired] Job failed: " +
        (err instanceof Error ? err.message : String(err))
    )
  }
}

export const config = {
  name: "cleanup-expired-campaign-messages",
  // Her saat başında çalışır — gereksiz API çağrısını önler,
  // kampanya son gün 1 saate kadar mesaj kalabilir (kabul edilebilir).
  schedule: "0 * * * *",
}
