import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  IEventBusModuleService,
} from "@medusajs/types"
import sellerCampaign from "@mercurjs/b2c-core/links/seller-campaign"
import { notifyMessengerUser } from "../lib/messenger.js"
import { getRedisClient } from "../lib/redis-client.js"

interface BudgetExhaustedPayload {
  campaign_id: string
  seller_id: string
}

type SellerCampaignLinkRow = { seller_id: string }

type PromotionGraphRow = { id: string; status?: string | null }

/**
 * Handles the "promotion.budget_exhausted" event.
 *
 * Steps:
 * 1. Resolve seller_id (from payload or via seller_campaign link table)
 * 2. Fetch active promotion IDs for this campaign via query.graph (no cross-domain
 *    mutation — promotion deactivation is delegated via event)
 * 3. Emit campaign.promotions_deactivation_requested for the promotion domain subscriber
 * 4. Emit seller.promotion_budget_exhausted for downstream handlers (e.g. email)
 * 5. Notify the seller via kayi-messenger (mutex-guarded to prevent duplicates)
 */
export default async function promotionBudgetExhaustedSubscriber({
  event: { data },
  container,
}: SubscriberArgs<BudgetExhaustedPayload>) {
  const { campaign_id, seller_id } = data

  const logger = container.resolve<{
    info: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
  }>(ContainerRegistrationKeys.LOGGER)

  if (!campaign_id) {
    logger.warn("[budget-exhausted] Missing campaign_id in event data — skipping")
    return
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const eventBus = container.resolve<IEventBusModuleService>(Modules.EVENT_BUS)

  // ── Resolve seller_id if not already provided ──────────────────────────────
  let targetSellerId = seller_id

  if (!targetSellerId) {
    const { data: links } = await query.graph({
      entity: sellerCampaign.entryPoint,
      fields: ["seller_id"],
      filters: { campaign_id, deleted_at: { $eq: null } },
    })

    const row = (links as SellerCampaignLinkRow[])[0]
    if (!row?.seller_id) {
      logger.warn(
        `[budget-exhausted] Could not resolve seller for campaign ${campaign_id} — skipping notification`
      )
      return
    }
    targetSellerId = row.seller_id
  }

  // ── Fetch active promotion IDs for this campaign via query.graph ───────────
  // Uses MedusaJS query abstraction — no cross-domain ORM relation load.
  // campaign_id is a native column on the promotion entity (FK), not a cross-
  // domain value, so filtering by it here is intentional and safe.
  let activePromotionIds: string[] = []
  try {
    const { data: promoRows } = await query.graph({
      entity: "promotion",
      fields: ["id", "status"],
      filters: { campaign_id },
    })
    activePromotionIds = (promoRows as PromotionGraphRow[])
      .filter((p) => p.status === "active")
      .map((p) => p.id)

    logger.info(
      `[budget-exhausted] Campaign ${campaign_id} has ${activePromotionIds.length} active promotion(s) scheduled for deactivation`
    )
  } catch (err: unknown) {
    logger.warn(
      `[budget-exhausted] Failed to fetch promotions for campaign ${campaign_id}: ` +
        (err instanceof Error ? err.message : String(err))
    )
  }

  // ── Delegate promotion deactivation to the promotion domain via event ───────
  // This keeps the campaign subscriber free of promotion-domain mutations.
  if (activePromotionIds.length > 0) {
    try {
      await eventBus.emit({
        name: "campaign.promotions_deactivation_requested",
        data: {
          campaign_id,
          promotion_ids: activePromotionIds,
          seller_id: targetSellerId,
        },
      })
      logger.info(
        `[budget-exhausted] Emitted campaign.promotions_deactivation_requested for ${activePromotionIds.length} promotion(s)`
      )
    } catch (err: unknown) {
      logger.warn(
        `[budget-exhausted] Failed to emit deactivation event for campaign ${campaign_id}: ` +
          (err instanceof Error ? err.message : String(err))
      )
    }
  }

  // ── Emit seller notification event (for future email/resend integration) ───
  try {
    await eventBus.emit({
      name: "seller.promotion_budget_exhausted",
      data: {
        seller_id: targetSellerId,
        campaign_id,
      },
    })
    logger.info(
      `[budget-exhausted] Emitted seller.promotion_budget_exhausted for seller ${targetSellerId} (campaign: ${campaign_id})`
    )
  } catch (err: unknown) {
    logger.warn(
      `[budget-exhausted] Failed to emit seller event: ` +
        (err instanceof Error ? err.message : String(err))
    )
  }

  // ── Messenger notification — mutex-guarded to prevent duplicate messages ──────
  let shouldNotify = true
  const redis = getRedisClient()
  if (redis) {
    try {
      const notifyKey = `budget_exhausted_notify:${campaign_id}`
      const alreadyNotified = await redis.get(notifyKey)
      if (alreadyNotified) {
        shouldNotify = false
        logger.info(
          `[budget-exhausted] Duplicate seller notification suppressed for campaign ${campaign_id}`
        )
      } else {
        await redis.set(notifyKey, "1", "EX", 60)
      }
    } catch {
      // Redis operation failed — proceed with notification (graceful degrade).
    }
  }

  if (shouldNotify) {
    try {
      notifyMessengerUser({
        targetUserId: targetSellerId,
        targetUserType: "SELLER",
        notificationType: "budget_exhausted",
        preview: "Kampanya butceniz tukendi. Kampanyaniz otomatik olarak duraklatildi.",
        subject: "Kampanya Butce Uyarisi",
      })

      logger.info(
        `[budget-exhausted] Notification dispatched to seller ${targetSellerId} for campaign ${campaign_id}`
      )
    } catch (err: unknown) {
      logger.warn(
        "[budget-exhausted] Failed to dispatch budget exhausted notification: " +
          (err instanceof Error ? err.message : String(err))
      )
    }
  }
}

export const config: SubscriberConfig = {
  event: "promotion.budget_exhausted",
}
