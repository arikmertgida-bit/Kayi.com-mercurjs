import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService } from "@medusajs/types"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import sellerPromotion from "@mercurjs/b2c-core/links/seller-promotion"

/** Runtime shape of a product row from query.graph */
type ProductRow = { id: string; title: string; thumbnail: string | null }

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await fetchSellerByAuthActorId(req.auth_context.actor_id, req.scope)

  const promotionService = req.scope.resolve<IPromotionModuleService>(
    Modules.PROMOTION
  )

  const { id } = req.params

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: ownerLinks } = await query.graph({
    entity: sellerPromotion.entryPoint,
    fields: ["promotion_id"],
    filters: { seller_id: seller.id, promotion_id: id, deleted_at: { $eq: null } },
  })
  if (ownerLinks.length === 0) {
    return res.status(403).json({ message: "Bu promosyon size ait değil." })
  }

  const promotion = await promotionService.retrievePromotion(id, {
    relations: ["application_method", "application_method.target_rules", "application_method.target_rules.values"],
  })

  const targetRules = promotion.application_method?.target_rules ?? []

  // Collect all product IDs from product_id attribute rules.
  const productIds: string[] = []
  for (const rule of targetRules) {
    if (rule.attribute === "product_id") {
      for (const v of rule.values ?? []) {
        if (typeof v.value === "string" && v.value.startsWith("prod_")) {
          productIds.push(v.value)
        }
      }
    }
  }

  // Batch-fetch product title + thumbnail when products are referenced.
  const productMap = new Map<string, { title: string; thumbnail: string | null }>()
  if (productIds.length > 0) {
    const { data: productRows } = await query.graph({
      entity: "product",
      fields: ["id", "title", "thumbnail"],
      filters: { id: productIds },
    })
    for (const row of productRows as ProductRow[]) {
      productMap.set(row.id, { title: row.title, thumbnail: row.thumbnail })
    }
  }

  // Return enriched target rules: product values get a populated `label` and `thumbnail`.
  const enrichedRules = targetRules.map((rule) => ({
    ...rule,
    values: (rule.values ?? []).map((v) => {
      const product = typeof v.value === "string" ? productMap.get(v.value) : undefined
      if (!product) return v
      return { ...v, label: product.title, thumbnail: product.thumbnail ?? undefined }
    }),
  }))

  return res.set("Cache-Control", "no-store").json({ rules: enrichedRules })
}
