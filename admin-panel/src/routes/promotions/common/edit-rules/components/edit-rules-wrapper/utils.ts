import type { AdminPromotionRule } from "@medusajs/types"

import type { ExtendedAdminPromotionRule } from "../../types"

export const getRuleValue = (rule: AdminPromotionRule) => {
  const r = rule as ExtendedAdminPromotionRule
  if (r.field_type === "number") {
    return parseInt(r.values as unknown as string)
  }
  return r.values
}
