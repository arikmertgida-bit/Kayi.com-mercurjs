import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules, PromotionStatus } from "@medusajs/framework/utils"
import { IPromotionModuleService } from "@medusajs/types"
import { deletePromotionMessages } from "../lib/messenger.js"

/** Payload shape emitted by promotion-budget-exhausted.ts */
interface PromotionsDeactivationRequestedPayload {
  campaign_id: string
  promotion_ids: string[]
  seller_id: string
}

/**
 * Handles the "campaign.promotions_deactivation_requested" event.
 *
 * Deactivates every promotion in promotion_ids and removes its messenger cards.
 * Each promotion is processed independently — a failure for one does NOT
 * prevent the others from being processed.
 *
 * This subscriber owns all promotion-domain state mutations triggered by
 * campaign budget exhaustion. The campaign domain (promotion-budget-exhausted.ts)
 * never calls updatePromotions directly; it emits this event instead.
 */
export default async function promotionBulkDeactivationSubscriber({
  event: { data },
  container,
}: SubscriberArgs<PromotionsDeactivationRequestedPayload>) {
  const { campaign_id, promotion_ids } = data

  const logger = container.resolve<{
    info: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
  }>(ContainerRegistrationKeys.LOGGER)

  if (!Array.isArray(promotion_ids) || promotion_ids.length === 0) {
    logger.warn(
      `[bulk-deactivation] No promotion_ids in payload for campaign ${campaign_id} — skipping`
    )
    return
  }

  logger.info(
    `[bulk-deactivation] Deactivating ${promotion_ids.length} promotion(s) for campaign ${campaign_id}`
  )

  const promotionService = container.resolve<IPromotionModuleService>(Modules.PROMOTION)

  // Single bulk update — one DB round-trip instead of N sequential awaited calls.
  // MedusaJS v2 updatePromotions accepts an array of partial DTOs, each with an id.
  try {
    await promotionService.updatePromotions(
      promotion_ids.map((id) => ({ id, status: PromotionStatus.INACTIVE }))
    )
    logger.info(
      `[bulk-deactivation] Bulk deactivated ${promotion_ids.length} promotion(s) for campaign ${campaign_id}`
    )
  } catch (err: unknown) {
    logger.warn(
      `[bulk-deactivation] Bulk deactivation failed for campaign ${campaign_id}: ` +
        (err instanceof Error ? err.message : String(err))
    )
    // Non-fatal: the hourly cleanup job will re-check and deactivate any survivors.
  }

  // Parallel fire-and-forget: delete messenger promotion cards for all promotions at once.
  // Promise.allSettled ensures one failure does not cancel the rest.
  // Each individual failure is logged but never throws.
  void Promise.allSettled(
    promotion_ids.map((promotionId) =>
      deletePromotionMessages(promotionId).catch((err: unknown) =>
        logger.warn(
          `[bulk-deactivation] Could not delete messenger messages for promotion ${promotionId}: ` +
            (err instanceof Error ? err.message : String(err))
        )
      )
    )
  )

  logger.info(
    `[bulk-deactivation] Done — dispatched messenger cleanup for ${promotion_ids.length} promotion(s) for campaign ${campaign_id}`
  )
}

export const config: SubscriberConfig = {
  event: "campaign.promotions_deactivation_requested",
}
