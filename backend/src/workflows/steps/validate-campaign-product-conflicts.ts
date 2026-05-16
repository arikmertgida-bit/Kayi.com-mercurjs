import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService } from "@medusajs/types"
import sellerPromotion from "@mercurjs/b2c-core/links/seller-promotion"
import { getRedisClient } from "../../lib/redis-client.js"

export type ValidateCampaignProductConflictsInput = {
  seller_id: string
  product_ids: string[]
}

/** Shape of a row returned from the seller_promotion link table. */
type SellerPromoLinkRow = { promotion_id: string }

/**
 * Compensation data returned by the forward handler.
 * `alreadyReleased: true` means the lock was released in the success path;
 * compensation should skip the DEL to avoid a redundant (harmless) no-op.
 */
type LockCompensationData = {
  lockKey: string
  usedRedis: boolean
  alreadyReleased: boolean
}

/**
 * Module-level in-memory lock map used when Redis is unavailable.
 * Each entry is the Unix-ms timestamp at which the lock expires.
 * Protects within a SINGLE Node.js process (workerMode:"shared").
 * For multi-process deployments Redis is required (see getRedisClient()).
 */
const inMemoryLocks = new Map<string, number>()

function acquireInMemoryLock(key: string, ttlMs: number): boolean {
  const now = Date.now()
  const expiry = inMemoryLocks.get(key)
  if (expiry !== undefined && now < expiry) return false
  inMemoryLocks.set(key, now + ttlMs)
  return true
}

function releaseInMemoryLock(key: string): void {
  inMemoryLocks.delete(key)
}

/** How long to hold the seller lock if we cannot release it sooner. */
const LOCK_TTL_SECONDS = 30

/**
 * Acquires the per-seller campaign-creation lock, then validates that none of
 * the requested product IDs are already targeted by an existing manual
 * promotion (is_automatic: false) belonging to this seller.
 *
 * TOCTOU Protection: the lock serialises concurrent campaign-creation requests
 * from the same seller so that only one passes the conflict check at a time.
 *
 * Lock lifecycle:
 *  - Acquired at the START of this step (before any read).
 *  - Released IMMEDIATELY after validation passes (success path).
 *    The lock's purpose is to guard the conflict-check read only — it is NOT
 *    needed for the creation steps that follow.
 *  - Released in COMPENSATION if a later step fails and the lock somehow
 *    was not released in the success path (defensive guard).
 *  - Released before throw on conflict so the seller can retry immediately.
 *
 * Redis: uses the shared `getRedisClient()` singleton from
 * `src/lib/redis-client.ts`. Falls back to module-level in-memory locks when
 * REDIS_URL is not configured (single-process / dev-only safety).
 */
export const validateCampaignProductConflictsStep = createStep(
  "validate-campaign-product-conflicts",
  async (
    { seller_id, product_ids }: ValidateCampaignProductConflictsInput,
    { container }
  ) => {
    const lockKey = `campaign_create_lock:${seller_id}`

    // ── Acquire per-seller lock ───────────────────────────────────────────────
    let lockAcquired = false
    let usedRedis = false

    const redis = getRedisClient()

    if (redis) {
      try {
        const result = await redis.set(lockKey, "1", "EX", LOCK_TTL_SECONDS, "NX")
        lockAcquired = result === "OK"
        usedRedis = true
      } catch {
        // Redis operation failed — fall back to in-memory lock.
        lockAcquired = acquireInMemoryLock(lockKey, LOCK_TTL_SECONDS * 1000)
        usedRedis = false
      }
    } else {
      // REDIS_URL not configured — in-memory lock (single-process protection).
      lockAcquired = acquireInMemoryLock(lockKey, LOCK_TTL_SECONDS * 1000)
      usedRedis = false
    }

    if (!lockAcquired) {
      throw new Error(
        "Eşzamanlı kampanya oluşturma isteği algılandı. " +
          "Lütfen kısa süre sonra tekrar deneyin."
      )
    }

    /**
     * Releases the lock acquired above.
     * Safe to call multiple times — Redis DEL is idempotent, Map.delete on a
     * non-existent key is a no-op.
     */
    const releaseLock = async (): Promise<void> => {
      if (usedRedis && redis) {
        try {
          await redis.del(lockKey)
        } catch {
          // Redis unavailable — release the in-memory fallback too.
          releaseInMemoryLock(lockKey)
        }
      } else {
        releaseInMemoryLock(lockKey)
      }
    }

    // ── Conflict validation (serialised by the lock above) ────────────────────
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const promotionService = container.resolve<IPromotionModuleService>(Modules.PROMOTION)

    const { data: promoLinks } = await query.graph({
      entity: sellerPromotion.entryPoint,
      fields: ["promotion_id"],
      filters: { seller_id, deleted_at: { $eq: null } },
    })

    const existingPromoIds = (promoLinks as SellerPromoLinkRow[]).map((r) => r.promotion_id)

    if (existingPromoIds.length > 0) {
      const codePromotions = await promotionService.listPromotions(
        { id: existingPromoIds, is_automatic: false } as Parameters<typeof promotionService.listPromotions>[0],
        {
          relations: [
            "application_method",
            "application_method.target_rules",
            "application_method.target_rules.values",
          ],
        }
      )

      // Build a Set of all product IDs already targeted by existing manual promos.
      // O(n) Set lookup replaces the previous O(n×m) nested find().
      const occupiedProductIds = new Set<string>()
      for (const promo of codePromotions) {
        for (const rule of promo.application_method?.target_rules ?? []) {
          if (rule.attribute === "items.product.id") {
            for (const v of rule.values ?? []) {
              if (v.value) occupiedProductIds.add(v.value)
            }
          }
        }
      }

      const conflictId = product_ids.find((pid) => occupiedProductIds.has(pid))
      if (conflictId) {
        const productService = container.resolve<{
          listProducts: (filter: { id: string[] }) => Promise<Array<{ title?: string }>>
        }>(Modules.PRODUCT)
        let productName = conflictId
        try {
          const [product] = await productService.listProducts({ id: [conflictId] })
          if (product?.title) productName = product.title
        } catch {
          // product name unavailable — show id
        }
        // Release before throwing so the seller can retry immediately.
        await releaseLock()
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          `${productName} adlı ürün bir promosyon kodu ile ilişkilendirilmiş olduğundan kampanyaya eklenemez.`
        )
      }
    }

    // ── Validation passed — release the lock immediately ─────────────────────
    // Creation steps that follow (campaign entity, promotion, links) do not
    // require serialisation and should not block other seller requests.
    await releaseLock()

    return new StepResponse(undefined, {
      lockKey,
      usedRedis,
      alreadyReleased: true,
    } satisfies LockCompensationData)
  },
  async (compensationData: LockCompensationData | undefined) => {
    // If the lock was released in the success path, nothing to do.
    if (!compensationData || compensationData.alreadyReleased) return

    const { lockKey, usedRedis } = compensationData
    const redis = getRedisClient()

    if (usedRedis && redis) {
      try {
        await redis.del(lockKey)
      } catch {
        releaseInMemoryLock(lockKey)
      }
    } else {
      releaseInMemoryLock(lockKey)
    }
  }
)

