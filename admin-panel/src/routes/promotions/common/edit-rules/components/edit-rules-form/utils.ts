import type { AdminPromotionRule } from "@medusajs/types"

import type { ExtendedAdminPromotionRule } from "../../types"

export const generateRuleAttributes = (rules?: AdminPromotionRule[]) =>
  (rules || []).map((rule) => {
    const r = rule as ExtendedAdminPromotionRule
    return {
      id: rule.id,
      required: r.required,
      field_type: r.field_type,
      disguised: r.disguised,
      attribute: rule.attribute ?? "",
      operator: rule.operator ?? "",
      values:
        r.field_type === "number" || rule.operator === "eq"
          ? typeof r.values === "object"
            ? r.values[0]?.value
            : r.values
          : r.values?.map((v) => v.value ?? ""),
    }
  })
