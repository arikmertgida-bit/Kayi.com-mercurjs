import { createContext, useContext } from "react"
import type { HttpTypes } from "@medusajs/types"
import type { getPricesForVariant } from "@/lib/helpers/get-product-price"

export interface ColorOption {
  value: string
  /** Hex / image URL from product.metadata.color_swatches */
  swatchUrl: string | undefined
  /** variant.metadata.thumbnail_url of the first variant with this color */
  thumbnailUrl: string | undefined
}

type VariantWithMeta = HttpTypes.StoreProductVariant & {
  metadata?: Record<string, unknown> | null
}

export interface ProductVariantContextValue {
  /** All option selections keyed by option title (lowercase) */
  selectedOptions: Record<string, string>
  selectedColor: string | undefined
  colorOptions: ColorOption[]
  /** All product option titles that are NOT color */
  nonColorOptionTitles: string[]
  /** Cross-filtered values for a given non-color option title */
  availableValuesForOption: (optionTitle: string) => string[]
  /** True if the specific size/numara value is in stock for the selected color */
  isValueInStock: (optionTitle: string, value: string) => boolean
  /** Variant matching ALL selected options (exact, no partial) */
  selectedVariant: VariantWithMeta | undefined
  variantPrice: ReturnType<typeof getPricesForVariant>
  variantStock: number
  isOutOfStock: boolean
  hasAnyPrice: boolean
  /** True when EVERY product option has a value selected */
  allOptionsSelected: boolean
  /** True when product has at least one option (i.e. it's a variant product) */
  hasVariants: boolean
  /** Gallery images for the selected color */
  colorGalleryImages: { id: string; url: string }[]
  /** Update an option — updates local state immediately AND pushes to URL */
  setOption: (optionTitle: string, value: string) => void
}

export const ProductVariantContext =
  createContext<ProductVariantContextValue | null>(null)

export function useProductVariantContext(): ProductVariantContextValue {
  const ctx = useContext(ProductVariantContext)
  if (!ctx) {
    throw new Error(
      "useProductVariantContext must be used within <ProductVariantProvider>"
    )
  }
  return ctx
}
