import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { ContainerRegistrationKeys, MedusaError, Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService } from "@medusajs/types"
import sellerPromotion from "@mercurjs/b2c-core/links/seller-promotion"

export type ValidateCampaignProductConflictsInput = {
  seller_id: string
  product_ids: string[]
}

/** Shape of a row returned from the seller_promotion link table. */
type SellerPromoLinkRow = { promotion_id: string }

/**
 * Minimal Redis interface for the SET NX (acquire) and DEL (release) operations.
 * Mirrors the ioredis API for the SET NX EX form.
 */
interface CampaignLockRedisClient {
  set(
    key: string,
    value: string,
    exMode: "EX",
    ttl: number,
    nxMode: "NX"
  ): Promise<string | null>
  del(key: string): Promise<unknown>
}

/**
 * Compensation data returned by the forward handler.
 * Signals which lock mechanism was used so compensation can mirror it.
 */
type LockCompensationData = {
  lockKey: string
  /** true = lock was acquired via Redis; false = acquired via in-memory fallback */
  usedRedis: boolean
}

/**
 * Module-level in-memory lock map used when Redis is unavailable.
 * Each entry is the Unix-ms timestamp at which the lock expires.
 * Protects within a SINGLE Node.js process (workerMode:"shared").
 * In multi-process deployments configure Redis for cross-process safety.
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

/** How long to hold the seller lock while the campaign-creation workflow runs. */
const LOCK_TTL_SECONDS = 30

/**
 * Validates that none of the requested product IDs are already targeted by an
 * existing manual promotion (is_automatic: false) belonging to this seller.
 *
 * TOCTOU Protection: acquires a per-seller distributed lock before reading the
 * existing promotions. Concurrent campaign-creation requests from the same seller
 * will receive a 409-like error instead of both passing the conflict check and
 * creating duplicate campaigns for the same products.
 *
 * Lock lifecycle:
 *  - Acquired HERE at the start of step 1 (before any read).
 *  - Released in the COMPENSATION of this step when the workflow fails.
 *  - On SUCCESS the lock expires naturally via TTL (≤ 30 s) since workflows
 *    do not have an explicit post-commit hook for step 1.
 *
 * Throws on conflict or lock contention — the workflow engine rolls back.
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

    try {
      const redis = container.resolve<CampaignLockRedisClient>("redisClient")
      const result = await redis.set(lockKey, "1", "EX", LOCK_TTL_SECONDS, "NX")
      lockAcquired = result === "OK"
      usedRedis = true
    } catch {
      // Redis not available — fall back to in-memory lock (single-process protection).
      lockAcquired = acquireInMemoryLock(lockKey, LOCK_TTL_SECONDS * 1000)
      usedRedis = false
    }

    if (!lockAcquired) {
      throw new Error(
        "Eşzamanlı kampanya oluşturma isteği algılandı. " +
          "Lütfen kısa süre sonra tekrar deneyin."
      )
    }

    // ── Conflict validation (now serialized per seller) ───────────────────────
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const promotionService = container.resolve<IPromotionModuleService>(Modules.PROMOTION)

    const { data: promoLinks } = await query.graph({
      entity: sellerPromotion.entryPoint,
      fields: ["promotion_id"],
      filters: { seller_id, deleted_at: { $eq: null } },
    })

    const existingPromoIds = (promoLinks as SellerPromoLinkRow[]).map((r) => r.promotion_id)

    // Çakışma bulunduğunda throw'dan ÖNCE lock'u serbest bırakacak yardımcı.
    // Compensation yalnızca StepResponse döndükten sonra çalışır; step throw ederse
    // çağrılmaz ve lock TTL sona erene (30 s) kadar takılı kalır.
    const releaseLock = async (): Promise<void> => {
      if (usedRedis) {
        try {
          const redis = container.resolve<CampaignLockRedisClient>("redisClient")
          await redis.del(lockKey)
        } catch {
          releaseInMemoryLock(lockKey)
        }
      } else {
        releaseInMemoryLock(lockKey)
      }
    }

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

      for (const promo of codePromotions) {
        const targetRules = promo.application_method?.target_rules ?? []

        for (const rule of targetRules) {
          if (rule.attribute === "items.product.id") {
            const ruleProductIds = (rule.values ?? []).map((v) => v.value)
            const conflictId = product_ids.find((pid) => ruleProductIds.includes(pid))
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
              await releaseLock()
              throw new MedusaError(
                MedusaError.Types.INVALID_DATA,
                `${productName} adlı ürün bir promosyon kodu ile ilişkilendirilmiş olduğundan kampanyaya eklenemez.`
              )
            }
          }
        }
      }
    }

    const compensationData: LockCompensationData = { lockKey, usedRedis }
    return new StepResponse(undefined, compensationData)
  },
  async (compensationData: LockCompensationData | undefined, { container }) => {
    // Release the seller lock so subsequent requests are not blocked.
    if (!compensationData) return

    const { lockKey, usedRedis } = compensationData

    if (usedRedis) {
      try {
        const redis = container.resolve<CampaignLockRedisClient>("redisClient")
        await redis.del(lockKey)
      } catch {
        // Redis unavailable during compensation — also release in-memory as a safety net.
        releaseInMemoryLock(lockKey)
      }
    } else {
      releaseInMemoryLock(lockKey)
    }
  }
)

