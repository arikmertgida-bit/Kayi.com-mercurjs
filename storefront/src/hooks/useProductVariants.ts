/**
 * useProductVariants
 *
 * Thin re-export of the shared ProductVariantContext value.
 * All variant state lives in <ProductVariantProvider> so every component on
 * the PDP shares the exact same state and updates happen in a single render
 * (no double-click, no stale gallery).
 *
 * Components that need the hook must be rendered inside <ProductVariantProvider>.
 */
export {
  useProductVariantContext as useProductVariants,
  type ColorOption,
  type ProductVariantContextValue as UseProductVariantsReturn,
} from "@/components/providers/ProductVariant/context"

