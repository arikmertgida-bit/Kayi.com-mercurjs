import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  IEventBusModuleService,
  IPromotionModuleService,
} from "@medusajs/types"
import { PromotionWithMeta } from "../api/vendor/shared/promotion-types.js"

/**
 * Minimal Redis client interface used for idempotency guard and per-campaign mutex.
 * Resolved from the DI container — if not available (test/dev without Redis),
 * all guards are skipped gracefully.
 */
interface MinimalRedisClient {
  get(key: string): Promise<string | null>
  set(key: string, value: string, exMode: "EX", ttl: number): Promise<unknown>
  del(key: string): Promise<unknown>
}

/**
 * Shape of a promotion as returned from query.graph on an order's promotions.
 * MedusaJS v2 exposes applied promotions via the "promotion" relation on orders.
 */
type OrderPromotionRow = { id: string }

/**
 * Full promotion shape with campaign and budget loaded.
 */
type PromotionWithCampaignBudget = PromotionWithMeta & {
  campaign?: {
    id: string
    budget?: {
      limit?: number | null
      used?: number | null
    } | null
  } | null
}

/**
 * Handles the "order.placed" event.
 *
 * For every promotion applied to the order, checks whether the associated
 * campaign budget has been fully consumed. If so, emits
 * "promotion.budget_exhausted" so the existing subscriber can notify the seller.
 *
 * Each promotion is processed independently — an error for one does NOT
 * prevent the others from being checked.
 *
 * This subscriber EXTENDS the existing PUT-triggered budget check in
 * campaigns/[id]/route.ts — that path continues to work unchanged.
 *
 * Soft-cap model (Amazon/Trendyol pattern):
 * - used >= limit * 1.05 → HARD CAP: emit budget_exhausted event
 * - used >= limit (but < 1.05x) → SOFT WARNING: log only, allow a few more orders
 *
 * Redis idempotency guard: prevents the same campaign_id from emitting
 * budget_exhausted more than once within 60 seconds. Degrades gracefully
 * if Redis is unavailable.
 */
export default async function orderPromotionBudgetCheckSubscriber({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve<{
    info: (...args: unknown[]) => void
    warn: (...args: unknown[]) => void
  }>(ContainerRegistrationKeys.LOGGER)

  const orderId = data?.id
  if (!orderId) {
    logger.warn("[order-promotion-budget-check] Missing order id in event data")
    return
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // ── Fetch promotions applied to this order via query.graph ─────────────────
  const { data: orderRows } = await query.graph({
    entity: "order",
    fields: ["id", "promotions.id"],
    filters: { id: orderId },
  })

  const order = (orderRows as Array<{ id: string; promotions?: OrderPromotionRow[] }>)[0]

  if (!order?.promotions?.length) {
    // No promotions applied — nothing to check
    return
  }

  const promotionService = container.resolve<IPromotionModuleService>(Modules.PROMOTION)
  const eventBus = container.resolve<IEventBusModuleService>(Modules.EVENT_BUS)

  // ── Batch-fetch all applied promotions in a single query (N+1 fix) ─────────
  // Previously each promotion was fetched individually inside the loop.
  // Now we resolve all IDs up front and build an O(1) lookup map.
  const allPromotionIds = order.promotions.map((p) => p.id)

  const allPromotions = (await promotionService.listPromotions(
    { id: allPromotionIds },
    { relations: ["campaign", "campaign.budget"] }
  )) as PromotionWithCampaignBudget[]

  const promotionMap = new Map<string, PromotionWithCampaignBudget>()
  for (const p of allPromotions) {
    promotionMap.set(p.id, p)
  }

  // ── Check each applied promotion independently ─────────────────────────────
  for (const appliedPromo of order.promotions) {
    try {
      const promo = promotionMap.get(appliedPromo.id)
      if (!promo) continue

      const campaign = promo.campaign
      if (!campaign) continue // Promotion not attached to a campaign — skip

      const budget = campaign.budget
      if (budget?.limit == null) continue // Limitless campaign — skip

      const used = budget.used ?? 0
      const limit = budget.limit

      // Soft-cap threshold: 5% overage margin before hard deactivation
      const hardCapThreshold = limit * 1.05

      if (used >= hardCapThreshold) {
        // HARD CAP exceeded: apply per-campaign mutex to prevent race conditions
        // in flash-sale scenarios where many order.placed events fire concurrently.
        // If another worker is already processing this campaign's budget check,
        // skip to avoid double-emit. Degrades gracefully if Redis is unavailable.
        const sellerId =
          typeof promo.metadata?.seller_id === "string"
            ? promo.metadata.seller_id
            : undefined

        let shouldEmit = true
        let redis: MinimalRedisClient | null = null

        try {
          redis = container.resolve<MinimalRedisClient>("redisClient")

          // Per-campaign processing mutex (5s TTL — prevents concurrent budget checks
          // from racing each other during flash sale burst traffic).
          const mutexKey = `budget_check:${campaign.id}`
          const mutexHeld = await redis.get(mutexKey)
          if (mutexHeld) {
            logger.info(
              `[order-promotion-budget-check] Budget check mutex held for campaign ${campaign.id} — skipping (another worker is processing)`
            )
            continue
          }
          await redis.set(mutexKey, "1", "EX", 5)

          // Idempotency guard: prevents the same campaign_id from emitting
          // budget_exhausted more than once within 60 seconds.
          const lockKey = `budget_exhausted:${campaign.id}`
          const alreadyFired = await redis.get(lockKey)
          if (alreadyFired) {
            logger.info(
              `[order-promotion-budget-check] Duplicate event suppressed for campaign ${campaign.id}`
            )
            shouldEmit = false
          } else {
            await redis.set(lockKey, "1", "EX", 60)
          }
        } catch {
          // Redis not available or "redisClient" not registered — emit without guard
        }

        if (shouldEmit) {
          await eventBus.emit({
            name: "promotion.budget_exhausted",
            data: { campaign_id: campaign.id, seller_id: sellerId ?? "" },
          })

          logger.info(
            `[order-promotion-budget-check] Budget hard-cap exceeded for campaign ${campaign.id} ` +
              `(used: ${used}, limit: ${limit}, threshold: ${hardCapThreshold}) ` +
              `(seller: ${sellerId ?? "unknown"}) — event emitted`
          )
        }

        // Release the processing mutex so subsequent workers can re-check
        // after the deactivation subscriber has run.
        if (redis) {
          try {
            await redis.del(`budget_check:${campaign.id}`)
          } catch {
            // Non-fatal — TTL will expire the key automatically
          }
        }
      } else if (used >= limit) {
        // SOFT WARNING: within 5% overage margin — log only, do not deactivate yet
        logger.info(
          `[order-promotion-budget-check] Campaign ${campaign.id} budget soft-limit reached ` +
            `(used: ${used}, limit: ${limit}) — within 5% margin, monitoring`
        )
      }
    } catch (err: unknown) {
      // Non-fatal: log and continue with the remaining promotions
      logger.warn(
        `[order-promotion-budget-check] Error checking budget for promotion ${appliedPromo.id}: ` +
          (err instanceof Error ? err.message : String(err))
      )
    }
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
