import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService } from "@medusajs/types"
import sellerProduct from "@mercurjs/b2c-core/links/seller-product"
import sellerPromotion from "@mercurjs/b2c-core/links/seller-promotion"
import {
  PromotionWithMeta,
  stripNamespaceFromCode,
} from "../../../../vendor/shared/promotion-types.js"

/** Shape of a row returned from the seller_product link table. */
type SellerProductLinkRow = { seller_id: string }

/** Shape of a row returned from the seller_promotion link table. */
type SellerPromotionLinkRow = { promotion_id: string }

/** Runtime shape of a promotion with all relations loaded. */
type PromotionFull = PromotionWithMeta & {
  /**
   * created_at is present on every MedusaJS entity at runtime but intentionally
   * omitted from the published PromotionDTO interface. Declared here for the
   * deterministic sort that surfaces the most recently created promotions first.
   */
  created_at?: string | Date | null
  application_method?: {
    type?: string
    value?: number
    target_type?: string
    target_rules?: Array<{
      attribute?: string
      operator?: string
      values?: Array<{ value?: string }>
    }>
  } | null
  campaign?: {
    name?: string
    starts_at?: string | Date | null
    ends_at?: string | Date | null
    budget?: { limit?: number; used?: number } | null
  } | null
}

/**
 * Returns true if the promotion applies to the given product.
 * If no target_rules are defined the promotion applies to all products.
 * A promotion passes if at least one rule's values includes the productId.
 */
function promotionAppliesToProduct(promo: PromotionFull, productId: string): boolean {
  const targetRules = promo.application_method?.target_rules ?? []
  if (targetRules.length === 0) return true
  return targetRules.some((rule) => {
    const vals = (rule.values ?? []).map((v) => v.value)
    return vals.includes(productId)
  })
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params // product id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const promotionService = req.scope.resolve<IPromotionModuleService>(Modules.PROMOTION)

  // 1. Ürünün satıcısını bul (seller_product link tablosu üzerinden).
  const { data: productLinks } = await query.graph({
    entity: sellerProduct.entryPoint,
    fields: ["seller_id"],
    filters: { product_id: id, deleted_at: { $eq: null } },
  })

  const productLinkRows = productLinks as SellerProductLinkRow[]

  if (productLinkRows.length === 0) {
    return res.json({ promotions: [] })
  }

  const sellerId = productLinkRows[0].seller_id

  // 2. Bu satıcıya ait tüm promotion ID'lerini link tablosundan çek — limit yok.
  // Sadece UUID string'ler döner, bellek yükü minimumdur.
  // status: ["active"] filtresi listPromotions'da DB katmanında uygulanır (set küçülür).
  // Slice(50) + created_at DESC sort aşağıda in-memory yapılır → deterministik sıralama.
  const { data: promoLinks } = await query.graph({
    entity: sellerPromotion.entryPoint,
    fields: ["promotion_id"],
    filters: { seller_id: sellerId, deleted_at: { $eq: null } },
  })

  const promotionIds = (promoLinks as SellerPromotionLinkRow[]).map((l) => l.promotion_id)

  if (promotionIds.length === 0) {
    return res.json({ promotions: [] })
  }

  // MedusaJS listPromotions status filter expects an array.
  const promotions = (await promotionService.listPromotions(
    { id: promotionIds, status: ["active"] },
    { relations: ["application_method", "application_method.target_rules", "campaign", "campaign.budget"] }
  )) as unknown as PromotionFull[]

  const now = new Date()

  // En yeni 50 aktif promosyonu belirle: created_at DESC sort → slice(50) → filtrele → formatla.
  // Bu sıralama deterministiktir: aynı seller'ın >50 aktif promosyonu varsa
  // her zaman en son yaratılanlar ürün detay sayfasına yansır.
  const active = promotions
    .sort((a, b) => {
      const aTime = a.created_at ? new Date(a.created_at as string).getTime() : 0
      const bTime = b.created_at ? new Date(b.created_at as string).getTime() : 0
      return bTime - aTime // DESC: yeniler önce
    })
    .slice(0, 50)
    .filter((p) => promotionAppliesToProduct(p, id))
    .filter((p) => {
      const campaign = p.campaign
      if (!campaign) return true
      if (campaign.ends_at && new Date(campaign.ends_at) <= now) return false
      return true
    })
    .filter((p) => {
      const sellerId = p.metadata?.seller_id
      // Vendor promotion (has seller_id): explicit "approved" zorunlu.
      // Bu kural; bilinmeyen/eksik değerleri de engeller — yalnızca beyaz liste geçer.
      if (sellerId) return p.metadata?.approval_status === "approved"
      // Platform promotion (admin yaratmış, seller_id yok): her zaman geçer.
      return true
    })
    .map((p) => {
      const budget = p.campaign?.budget

      const budgetRemainingPct =
        budget?.limit != null && budget?.used != null
          ? Math.max(0, Math.round((1 - budget.used / budget.limit) * 100))
          : null

      return {
        id: p.id,
        display_code: p.code
          ? stripNamespaceFromCode(p.code, String(p.metadata?.seller_id ?? sellerId))
          : null,
        type: p.type,
        status: p.status,
        is_automatic: p.is_automatic,
        discount_type: p.application_method?.type ?? null,
        discount_value: p.application_method?.value ?? null,
        scope: p.metadata?.promotion_scope ?? "seller",
        campaign: p.campaign
          ? {
              name: p.campaign.name ?? null,
              starts_at: p.campaign.starts_at ?? null,
              ends_at: p.campaign.ends_at ?? null,
              budget_remaining_pct: budgetRemainingPct,
            }
          : null,
      }
    })

  return res.json({ promotions: active })
}
