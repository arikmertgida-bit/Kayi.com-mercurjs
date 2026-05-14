import { MedusaRequest, MedusaResponse } from "@medusajs/framework"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { IPromotionModuleService } from "@medusajs/types"

type CustomerGroupRow = { id: string; name: string }

const COUNTRY_DISPLAY_NAMES: Record<string, string> = {
  tr: "Türkiye", us: "ABD", de: "Almanya", gb: "Birleşik Krallık", fr: "Fransa",
  nl: "Hollanda", be: "Belçika", at: "Avusturya", it: "İtalya", es: "İspanya",
  gr: "Yunanistan", ru: "Rusya", pl: "Polonya", se: "İsveç", no: "Norveç",
  dk: "Danimarka", fi: "Finlandiya", ch: "İsviçre", pt: "Portekiz", ie: "İrlanda",
  ro: "Romanya", bg: "Bulgaristan", hu: "Macaristan", cz: "Çekya", sk: "Slovakya",
  hr: "Hırvatistan", si: "Slovenya", az: "Azerbaycan", sa: "Suudi Arabistan",
  ae: "BAE", kw: "Kuveyt", qa: "Katar", jo: "Ürdün", eg: "Mısır",
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params

  const promotionService = req.scope.resolve<IPromotionModuleService>(Modules.PROMOTION)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const promotion = await promotionService.retrievePromotion(id, {
    relations: ["rules", "rules.values"],
  })

  const rules = promotion.rules ?? []

  // Collect customer group IDs.
  const cgIds: string[] = []
  for (const rule of rules) {
    if (rule.attribute === "customer.groups.id") {
      for (const v of rule.values ?? []) {
        if (typeof v.value === "string" && v.value.startsWith("cusgroup_")) {
          cgIds.push(v.value)
        }
      }
    }
  }

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

  const enrichedRules = rules.map((rule) => ({
    ...rule,
    values: (rule.values ?? []).map((v) => {
      if (typeof v.value !== "string") return v
      const cgName = cgMap.get(v.value)
      if (cgName !== undefined) return { ...v, label: cgName }
      if (rule.attribute === "shipping_address.country_code") {
        const countryName = COUNTRY_DISPLAY_NAMES[v.value.toLowerCase()]
        if (countryName) return { ...v, label: countryName }
      }
      return v
    }),
  }))

  return res.set("Cache-Control", "no-cache, no-store, must-revalidate").json({ rules: enrichedRules })
}
