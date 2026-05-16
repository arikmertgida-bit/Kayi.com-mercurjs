import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  IEventBusModuleService,
  IPromotionModuleService,
} from "@medusajs/types"
import { PromotionWithMeta } from "../lib/promotion-types.js"
import { getRedisClient } from "../lib/redis-client.js"

/**
 * Module-level in-memory lock map used when Redis is unavailable.
 *
 * Each entry is the Unix-ms timestamp at which the lock expires.
 * Correctness guarantee: protects within a SINGLE Node.js process only.
 * In workerMode:"worker" with multiple processes, Redis is still required
 * for cross-process deduplication. This fallback prevents double-emission
 * when running in workerMode:"shared" (default single-process setup) without Redis.
 */
const inMemoryLocks = new Map<string, number>()

/** Acquire a lock. Returns true when the lock is now held, false if already held. */
function acquireInMemoryLock(key: string, ttlMs: number): boolean {
  const now = Date.now()
  const expiry = inMemoryLocks.get(key)
  if (expiry !== undefined && now < expiry) {
    return false // lock already held
  }
  inMemoryLocks.set(key, now + ttlMs)
  return true
}

/** Release a lock immediately (called after processing so the next worker can enter). */
function releaseInMemoryLock(key: string): void {
  inMemoryLocks.delete(key)
}

/**
 * Shape of a promotion as returned from query.graph on an order's promotions.
 * MedusaJS v2 exposes applied promotions via the "promotion" relation on orders.
 */
type OrderPromotionRow = { id: string }

/**
 * Promotion shape after the flat listPromotions call (no deep campaign load).
 * campaign_id is a native column on the promotion entity.
 */
type PromotionWithCampaignId = PromotionWithMeta & {
  campaign_id?: string | null
}

/**
 * Campaign shape returned by listCampaigns({ relations: ["budget"] }).
 */
type CampaignWithBudget = {
  id: string
  budget?: {
    limit?: number | null
    used?: number | null
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

  // ── Batch-fetch all applied promotions (no deep campaign relation load) ─────
  // Promotions are fetched flat; campaign budget is resolved via a separate
  // listCampaigns call below. This keeps each query within a single domain.
  const allPromotionIds = order.promotions.map((p) => p.id)

  const allPromotions = (await promotionService.listPromotions(
    { id: allPromotionIds },
    { relations: [] }
  )) as PromotionWithCampaignId[]

  const promotionMap = new Map<string, PromotionWithCampaignId>()
  for (const p of allPromotions) {
    promotionMap.set(p.id, p)
  }

  // ── Fetch campaign budgets in a single separate query ─────────────────────
  const uniqueCampaignIds = [
    ...new Set(
      allPromotions
        .map((p) => p.campaign_id)
        .filter((id): id is string => typeof id === "string")
    ),
  ]

  const campaignBudgetMap = new Map<string, CampaignWithBudget["budget"]>()
  if (uniqueCampaignIds.length > 0) {
    const campaigns = (await promotionService.listCampaigns(
      { id: uniqueCampaignIds },
      { relations: ["budget"] }
    )) as CampaignWithBudget[]
    for (const c of campaigns) {
      campaignBudgetMap.set(c.id, c.budget ?? null)
    }
  }

  // ── Check each applied promotion independently ─────────────────────────────
  for (const appliedPromo of order.promotions) {
    try {
      const promo = promotionMap.get(appliedPromo.id)
      if (!promo) continue

      const campaignId = promo.campaign_id
      if (!campaignId) continue // Promotion not attached to a campaign — skip

      const budget = campaignBudgetMap.get(campaignId)
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

        const mutexKey = `budget_check:${campaignId}`
        const lockKey = `budget_exhausted:${campaignId}`

        const redis = getRedisClient()

        if (redis) {
          try {
            // Per-campaign processing mutex (5s TTL — prevents concurrent budget checks
            // from racing each other during flash sale burst traffic).
            const mutexHeld = await redis.get(mutexKey)
            if (mutexHeld) {
              logger.info(
                `[order-promotion-budget-check] Budget check mutex held for campaign ${campaignId} — skipping (another worker is processing)`
              )
              continue
            }
            await redis.set(mutexKey, "1", "EX", 5)

            // Idempotency guard: prevents the same campaign_id from emitting
            // budget_exhausted more than once within 60 seconds.
            const alreadyFired = await redis.get(lockKey)
            if (alreadyFired) {
              logger.info(
                `[order-promotion-budget-check] Duplicate event suppressed for campaign ${campaignId}`
              )
              shouldEmit = false
            } else {
              await redis.set(lockKey, "1", "EX", 60)
            }
          } catch {
            // Redis operation failed — fall back to in-memory locks for this request.
            const mutexAcquired = acquireInMemoryLock(mutexKey, 5_000)
            if (!mutexAcquired) {
              logger.info(
                `[order-promotion-budget-check] (in-memory) Budget check mutex held for campaign ${campaignId} — skipping`
              )
              continue
            }
            const idempotencyAcquired = acquireInMemoryLock(lockKey, 60_000)
            if (!idempotencyAcquired) {
              logger.info(
                `[order-promotion-budget-check] (in-memory) Duplicate event suppressed for campaign ${campaignId}`
              )
              shouldEmit = false
            }
          }
        } else {
          // REDIS_URL not configured — in-memory fallback (single-process protection).
          const mutexAcquired = acquireInMemoryLock(mutexKey, 5_000)
          if (!mutexAcquired) {
            logger.info(
              `[order-promotion-budget-check] (in-memory) Budget check mutex held for campaign ${campaignId} — skipping`
            )
            continue
          }
          const idempotencyAcquired = acquireInMemoryLock(lockKey, 60_000)
          if (!idempotencyAcquired) {
            logger.info(
              `[order-promotion-budget-check] (in-memory) Duplicate event suppressed for campaign ${campaignId}`
            )
            shouldEmit = false
          }
        }

        if (shouldEmit) {
          await eventBus.emit({
            name: "promotion.budget_exhausted",
            data: { campaign_id: campaignId, seller_id: sellerId ?? "" },
          })

          logger.info(
            `[order-promotion-budget-check] Budget hard-cap exceeded for campaign ${campaignId} ` +
              `(used: ${used}, limit: ${limit}, threshold: ${hardCapThreshold}) ` +
              `(seller: ${sellerId ?? "unknown"}) — event emitted`
          )
        }

        // Release the processing mutex so subsequent workers can re-check
        // after the deactivation subscriber has run.
        const redisForRelease = getRedisClient()
        if (redisForRelease) {
          try {
            await redisForRelease.del(mutexKey)
          } catch {
            // Non-fatal — TTL will expire the key automatically
            releaseInMemoryLock(mutexKey)
          }
        } else {
          releaseInMemoryLock(mutexKey)
        }
      } else if (used >= limit) {
        // SOFT WARNING: within 5% overage margin — log only, do not deactivate yet
        logger.info(
          `[order-promotion-budget-check] Campaign ${campaignId} budget soft-limit reached ` +
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
