"use client"

import { HttpTypes } from "@medusajs/types"
import { Chip } from "@/components/atoms"
import { useProductVariants, type ColorOption } from "@/hooks/useProductVariants"

const COLOR_TITLES = ["color", "renk", "colour"]

export const ProductVariants = ({
  product,
}: {
  product: HttpTypes.StoreProduct & {
    metadata?: Record<string, unknown> | null
  }
}) => {
  const {
    selectedOptions,
    colorOptions,
    availableValuesForOption,
    isValueInStock,
    setOption,
  } = useProductVariants()

  const productOptions = product.options ?? []

  return (
    <div className="my-4 space-y-3">
      {productOptions.map((opt) => {
        const titleLower = opt.title.toLowerCase()
        const isColor = COLOR_TITLES.includes(titleLower)

        if (isColor) {
          return (
            <div key={opt.id}>
              <span className="label-md text-secondary">{opt.title}: </span>
              <span className="label-md text-primary">
                {selectedOptions[titleLower]}
              </span>
              <div className="flex flex-wrap gap-2 mt-2">
                {colorOptions.map((colorOpt: ColorOption) => (
                  <Chip
                    key={colorOpt.value}
                    selected={selectedOptions[titleLower] === colorOpt.value}
                    color
                    swatchImage={colorOpt.swatchUrl ?? colorOpt.thumbnailUrl}
                    value={colorOpt.value}
                    onSelect={() => setOption(titleLower, colorOpt.value)}
                  />
                ))}
              </div>
            </div>
          )
        }

        // Non-color option: cross-filtered values only
        const availableValues = availableValuesForOption(opt.title)

        return (
          <div key={opt.id}>
            <span className="label-md text-secondary">{opt.title}: </span>
            <span className="label-md text-primary">
              {selectedOptions[titleLower]}
            </span>
            <div className="flex flex-wrap gap-2 mt-2">
              {availableValues.map((value) => {
                const inStock = isValueInStock(opt.title, value)
                return (
                  <Chip
                    key={value}
                    selected={selectedOptions[titleLower] === value}
                    disabled={!inStock}
                    value={value}
                    onSelect={() => setOption(titleLower, value)}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
