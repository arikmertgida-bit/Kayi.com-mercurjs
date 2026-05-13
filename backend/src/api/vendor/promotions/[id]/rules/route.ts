import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService } from "@medusajs/types"
import { fetchSellerByAuthActorId } from "@mercurjs/b2c-core/shared/infra/http/utils/seller"
import sellerPromotion from "@mercurjs/b2c-core/links/seller-promotion"

/** Runtime shape of a customer group row from query.graph */
type CustomerGroupRow = { id: string; name: string }

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
    relations: ["rules", "rules.values"],
  })

  const rules = promotion.rules ?? []

  // Collect all customer group IDs referenced by rules with attribute "customer_group_id".
  const cgIds: string[] = []
  for (const rule of rules) {
    if (rule.attribute === "customer_group_id") {
      for (const v of rule.values ?? []) {
        if (typeof v.value === "string" && v.value.startsWith("cusgroup_")) {
          cgIds.push(v.value)
        }
      }
    }
  }

  // Batch-fetch customer group names when any are referenced.
  const cgMap = new Map<string, string>()
  if (cgIds.length > 0) {
    const { data: cgRows } = await query.graph({
      entity: "customer_group",
      fields: ["id", "name"],
      filters: { id: cgIds },
    })
    for (const row of cgRows as CustomerGroupRow[]) {
      cgMap.set(row.id, row.name)
    }
  }

  // Return enriched rules: values with a populated `label` for customer groups.
  const enrichedRules = rules.map((rule) => ({
    ...rule,
    values: (rule.values ?? []).map((v) => {
      const name = typeof v.value === "string" ? cgMap.get(v.value) : undefined
      return name !== undefined ? { ...v, label: name } : v
    }),
  }))

  return res.set("Cache-Control", "no-store").json({ rules: enrichedRules })
}
