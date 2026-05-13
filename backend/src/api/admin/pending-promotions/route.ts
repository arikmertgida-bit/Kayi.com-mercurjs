import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService } from "@medusajs/types"
import sellerPromotion from "@mercurjs/b2c-core/links/seller-promotion"
import { PromotionWithMeta } from "../../vendor/shared/promotion-types.js"

/**
 * Shape of a row returned from the seller_promotion link table.
 * seller_id is always present — it is the owning seller.
 */
type SellerPromotionLinkRow = { promotion_id: string; seller_id: string }

/**
 * Maps promotion `status` values used by vendor promotions to a logical
 * approval_status string for the admin UI.
 *
 * Status convention (vendor promotions only):
 *   inactive → pending   (created, awaiting admin review)
 *   active   → approved  (admin approved, live at checkout)
 *   draft    → rejected  (admin rejected)
 *
 * Admin-created promotions are never in the seller_promotion link table,
 * so they will never appear in this endpoint regardless of their status.
 */
function toApprovalStatus(status: string | undefined): string {
  if (status === "active") return "approved"
  if (status === "draft") return "rejected"
  return "pending"
}

/**
 * GET /admin/pending-promotions
 *
 * Returns vendor-owned promotions filtered by their approval status.
 * Source of truth for vendor ownership is the seller_promotion link table.
 * Source of truth for approval state is the promotion.status column:
 *   inactive = pending, active = approved, draft = rejected.
 *
 * Query params:
 *   approval_status — "pending" | "approved" | "rejected" (default: "pending")
 *   seller_id       — scope to a specific seller (optional)
 *   limit           — max 100, default 20
 *   offset          — default 0
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const actorId = (req as { auth_context?: { actor_id?: string } }).auth_context?.actor_id
  if (!actorId) {
    return res.status(401).json({ message: "Unauthorized" })
  }

  const { approval_status = "pending", seller_id, limit = "20", offset = "0" } = req.query as {
    approval_status?: string
    seller_id?: string
    limit?: string
    offset?: string
  }

  const parsedLimit = Math.min(parseInt(limit, 10) || 20, 100)
  const parsedOffset = parseInt(offset, 10) || 0

  const promotionService = req.scope.resolve<IPromotionModuleService>(Modules.PROMOTION)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  // Build link table filters — always scope to vendor-owned promotions.
  const linkFilters: Record<string, unknown> = { deleted_at: { $eq: null } }
  if (seller_id) linkFilters.seller_id = seller_id

  // Fetch ALL matching link rows (up to 500) so we can do status filtering in JS.
  // This is acceptable because the total number of vendor promotions is bounded.
  const { data: linkRows } = await query.graph({
    entity: sellerPromotion.entryPoint,
    fields: ["promotion_id", "seller_id"],
    filters: linkFilters,
    pagination: { skip: 0, take: 500 },
  })

  const allLinks = linkRows as SellerPromotionLinkRow[]
  const promotionToSellerMap = new Map(allLinks.map((r) => [r.promotion_id, r.seller_id]))
  const allPromoIds = allLinks.map((r) => r.promotion_id)

  if (allPromoIds.length === 0) {
    return res.json({ promotions: [], count: 0, limit: parsedLimit, offset: parsedOffset })
  }

  // Fetch promotions for all linked IDs with application_method relations.
  const allPromotions = (await promotionService.listPromotions(
    { id: allPromoIds },
    { relations: ["application_method", "application_method.target_rules", "application_method.target_rules.values"] }
  )) as PromotionWithMeta[]

  // Filter by approval_status using the status-based mapping.
  const targetApproval = approval_status
  const filtered = allPromotions.filter((p) => toApprovalStatus(p.status) === targetApproval)

  // Apply pagination on the filtered set.
  const count = filtered.length
  const paginated = filtered.slice(parsedOffset, parsedOffset + parsedLimit)

  // Augment each promotion with its owning seller_id from the link table.
  const promotions = paginated.map((p) => ({
    ...p,
    seller_id: promotionToSellerMap.get(p.id) ?? null,
    approval_status: toApprovalStatus(p.status),
  }))

  return res.json({ promotions, count, limit: parsedLimit, offset: parsedOffset })
}
