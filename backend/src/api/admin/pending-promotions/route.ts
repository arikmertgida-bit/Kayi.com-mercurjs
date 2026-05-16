import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService } from "@medusajs/types"
import sellerPromotion from "@mercurjs/b2c-core/links/seller-promotion"
import { PromotionWithMeta } from "../../../lib/promotion-types.js"

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

  // approval_status → promotion.status dönüşüm tablosu (vendor durum kuralı):
  //   pending  → inactive  (oluşturuldu, inceleme bekliyor)
  //   approved → active    (admin onayladı, checkout'ta etkin)
  //   rejected → draft     (admin reddetti)
  const approvalToStatus: Record<string, string> = {
    pending: "inactive",
    approved: "active",
    rejected: "draft",
  }
  const promotionStatus = approvalToStatus[approval_status] ?? "inactive"

  // Link tablosundan TÜM satır ID'lerini çek — 500 limiti kaldırıldı.
  // Link satırları yalnızca UUID içerir (~36 byte); 10.000 satır bile < 400 KB.
  // is_automatic filtresi promotionService düzeyinde status ile uygulanıyor.
  const { data: linkRows } = await query.graph({
    entity: sellerPromotion.entryPoint,
    fields: ["promotion_id", "seller_id"],
    filters: linkFilters,
  })

  const allLinks = linkRows as SellerPromotionLinkRow[]
  const promotionToSellerMap = new Map(allLinks.map((r) => [r.promotion_id, r.seller_id]))
  const allPromoIds = allLinks.map((r) => r.promotion_id)

  if (allPromoIds.length === 0) {
    return res.json({ promotions: [], count: 0, limit: parsedLimit, offset: parsedOffset })
  }

  // İki paralel DB sorgusu — status filtresi + pagination tamamen DB düzeyinde:
  // (1) count: bu approval_status'a sahip toplam promosyon sayısı
  // (2) page: skip/take ile doğrudan sayfalanmış + tam ilişkili çıktı
  const [countResult, paginated] = await Promise.all([
    promotionService.listPromotions(
      { id: allPromoIds, status: [promotionStatus] } as unknown as Parameters<typeof promotionService.listPromotions>[0],
      { select: ["id"] }
    ),
    promotionService.listPromotions(
      { id: allPromoIds, status: [promotionStatus] } as unknown as Parameters<typeof promotionService.listPromotions>[0],
      {
        relations: [
          "application_method",
          "application_method.target_rules",
          "application_method.target_rules.values",
        ],
        skip: parsedOffset,
        take: parsedLimit,
      }
    ) as Promise<PromotionWithMeta[]>,
  ])

  const count = countResult.length

  // Collect seller IDs and product IDs for enrichment.
  const sellerIds = [...new Set(
    paginated.map((p) => promotionToSellerMap.get(p.id)).filter((id): id is string => !!id)
  )]
  const productIds: string[] = []
  for (const p of paginated) {
    for (const tr of p.application_method?.target_rules ?? []) {
      if (tr.attribute === "items.product.id") {
        for (const v of tr.values ?? []) {
          if (typeof v.value === "string") productIds.push(v.value)
        }
      }
    }
  }

  // Batch-fetch seller names.
  const sellerNameMap = new Map<string, string>()
  if (sellerIds.length > 0) {
    const { data: sellerRows } = await query.graph({
      entity: "seller",
      fields: ["id", "name"],
      filters: { id: sellerIds },
    })
    for (const s of sellerRows as { id: string; name: string }[]) {
      sellerNameMap.set(s.id, s.name)
    }
  }

  // Batch-fetch product titles.
  const productTitleMap = new Map<string, string>()
  if (productIds.length > 0) {
    const { data: productRows } = await query.graph({
      entity: "product",
      fields: ["id", "title"],
      filters: { id: productIds },
    })
    for (const p of productRows as { id: string; title: string }[]) {
      productTitleMap.set(p.id, p.title)
    }
  }

  // Augment each promotion with seller info, approval status, and enriched product labels.
  const promotions = paginated.map((p) => {
    const sid = promotionToSellerMap.get(p.id) ?? null
    return {
      ...p,
      seller_id: sid,
      seller_name: sid ? (sellerNameMap.get(sid) ?? null) : null,
      approval_status: toApprovalStatus(p.status),
      application_method: p.application_method
        ? {
            ...p.application_method,
            target_rules: (p.application_method.target_rules ?? []).map((tr) => ({
              ...tr,
              values: (tr.values ?? []).map((v) => {
                const title = typeof v.value === "string" ? productTitleMap.get(v.value) : undefined
                return title ? { ...v, label: title } : v
              }),
            })),
          }
        : p.application_method,
    }
  })

  return res.json({ promotions, count, limit: parsedLimit, offset: parsedOffset })
}
