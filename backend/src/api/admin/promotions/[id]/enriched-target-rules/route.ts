import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService } from "@medusajs/types"

type ProductRow = { id: string; title: string; thumbnail: string | null }

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params

  const promotionService = req.scope.resolve<IPromotionModuleService>(Modules.PROMOTION)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const promotion = await promotionService.retrievePromotion(id, {
    relations: [
      "application_method",
      "application_method.target_rules",
      "application_method.target_rules.values",
    ],
  })

  const targetRules = promotion.application_method?.target_rules ?? []

  const productIds: string[] = []
  for (const rule of targetRules) {
    if (rule.attribute === "items.product.id") {
      for (const v of rule.values ?? []) {
        if (typeof v.value === "string" && v.value.startsWith("prod_")) {
          productIds.push(v.value)
        }
      }
    }
  }

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

  const enrichedRules = targetRules.map((rule) => ({
    ...rule,
    values: (rule.values ?? []).map((v) => {
      const product = typeof v.value === "string" ? productMap.get(v.value) : undefined
      if (!product) return v
      return { ...v, label: product.title, thumbnail: product.thumbnail ?? undefined }
    }),
  }))

  return res.set("Cache-Control", "no-cache, no-store, must-revalidate").json({ rules: enrichedRules })
}
