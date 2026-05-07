import type { AdminPromotionRule } from "@medusajs/types"

export interface ExtendedPromotionRuleValue {
  id?: string
  value?: string
  label?: string
}

/**
 * Extended AdminPromotionRule that includes UI-specific fields populated
 * from rule attribute options (required, field_type, disguised) and
 * display labels (attribute_label, operator_label).
 * These extra fields are present in API responses but not in the base type definition.
 */
export interface ExtendedAdminPromotionRule extends AdminPromotionRule {
  required?: boolean
  field_type?: string
  disguised?: boolean
  attribute_label?: string
  operator_label?: string
}
