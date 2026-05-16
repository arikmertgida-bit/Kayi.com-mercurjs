import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService } from "@medusajs/types"
import sellerPromotion from "@mercurjs/b2c-core/links/seller-promotion"
import { PromotionWithMeta } from "../../../lib/promotion-types.js"

/** Shape of a row returned from the seller_promotion link table. */
type SellerPromotionLinkRow = { promotion_id: string }

/**
 * GET /admin/promotions
 *
 * Returns promotions with optional filtering by metadata.approval_status
 * and metadata.seller_id. Pagination via limit/offset.
 *
 * Query params:
 *   status    — "pending" | "approved" | "rejected" (filters metadata.approval_status)
 *   seller_id — seller ID to scope results (optional)
 *   limit     — max 100, default 20
 *   offset    — default 0
 *
 * Two execution paths to avoid O(n) full-table scans:
 *
 * Path A (seller_id present): queries the seller_promotion link table for IDs
 *   belonging to that seller, then fetches only those promotions. O(log n).
 *
 * Path B (seller_id absent): fetches a bounded slice of promotions (max 200 rows)
 *   at the SQL level, then applies metadata.approval_status filter in Node.js.
 *   This is acceptable for admin moderation queues where pending pools are small.
 *   It prevents the original O(n) heap load of the entire promotions table.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const actorId = (req as { auth_context?: { actor_id?: string } }).auth_context?.actor_id
  if (!actorId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const { status, seller_id, limit = "20", offset = "0" } = req.query as {
    status?: string
    seller_id?: string
    limit?: string
    offset?: string
  }

  const parsedLimit = Math.min(parseInt(limit, 10) || 20, 100)
  const parsedOffset = parseInt(offset, 10) || 0

  const promotionService = req.scope.resolve<IPromotionModuleService>(Modules.PROMOTION)

  if (seller_id) {
    // ── Path A: seller-scoped — use link table (O(log n)) ──────────────────
    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

    const { data: linkRows, metadata: linkMeta } = await query.graph({
      entity: sellerPromotion.entryPoint,
      fields: ["promotion_id"],
      filters: { seller_id, deleted_at: { $eq: null } },
      pagination: { skip: parsedOffset, take: parsedLimit },
    })

    const count = typeof linkMeta?.count === "number" ? linkMeta.count : 0
    const promotionIds = (linkRows as SellerPromotionLinkRow[]).map((r) => r.promotion_id)

    if (promotionIds.length === 0) {
      return res.json({ promotions: [], count, limit: parsedLimit, offset: parsedOffset })
    }

    let promotions = (await promotionService.listPromotions(
      { id: promotionIds },
      { relations: ["application_method", "application_method.target_rules"] }
    )) as PromotionWithMeta[]

    // Post-filter by metadata.approval_status on the already-bounded result set.
    if (status) {
      promotions = promotions.filter((p) => p.metadata?.approval_status === status)
    }

    return res.json({ promotions, count, limit: parsedLimit, offset: parsedOffset })
  }

  // ── Path B: platform-wide — bounded scan, JS filter on slice ───────────────
  // Fetches a maximum of SCAN_WINDOW rows from the DB (hard cap), then applies
  // the metadata filter. Prevents unbounded heap load. Suitable for admin
  // moderation queues where the pending set is typically small.
  const SCAN_WINDOW = 200

  const scanned = (await promotionService.listPromotions(
    {},
    { relations: ["application_method", "application_method.target_rules"], take: SCAN_WINDOW, skip: parsedOffset, order: { created_at: "DESC" } }
  )) as PromotionWithMeta[]

  const filtered = status
    ? scanned.filter((p) => p.metadata?.approval_status === status)
    : scanned

  const paginated = filtered.slice(0, parsedLimit)

  // count reflects the number of matching items within the scan window.
  return res.json({ promotions: paginated, count: filtered.length, limit: parsedLimit, offset: parsedOffset })
}
