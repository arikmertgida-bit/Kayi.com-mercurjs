"use client"

import { useState } from "react"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@/components/atoms"
import { useProductVariants } from "@/hooks/useProductVariants"
import { useCartContext } from "@/components/providers"
import { addToCart } from "@/lib/data/cart"
import { toast } from "@/lib/helpers/toast"

export const StickyAddToCart = ({
  locale,
}: {
  locale: string
}) => {
  const { onAddToCart, cart } = useCartContext()
  const [isAdding, setIsAdding] = useState(false)

  const {
    selectedVariant,
    variantPrice,
    variantStock,
    isOutOfStock,
    hasAnyPrice,
    allOptionsSelected,
    hasVariants,
  } = useProductVariants()

  const variantHasPrice = !!selectedVariant?.calculated_price

  const isVariantStockMaxLimitReached =
    (cart?.items?.find((item) => item.variant_id === selectedVariant?.id)
      ?.quantity ?? 0) >= variantStock

  const handleAddToCart = async () => {
    if (!selectedVariant?.id || !hasAnyPrice || !allOptionsSelected) return

    setIsAdding(true)

    const subtotal = +(variantPrice?.calculated_price_without_tax_number || 0)
    const total = +(variantPrice?.calculated_price_number || 0)

    const storeCartLineItem = {
      thumbnail: "",
      product_title: "",
      quantity: 1,
      subtotal,
      total,
      tax_total: total - subtotal,
      variant_id: selectedVariant.id,
      product_id: (selectedVariant as any).product_id ?? "",
      variant: selectedVariant,
    }

    try {
      if (!isVariantStockMaxLimitReached) {
        onAddToCart(storeCartLineItem as any, variantPrice?.currency_code || "eur")
      }
      await addToCart({
        variantId: selectedVariant.id,
        quantity: 1,
        countryCode: locale,
      })
    } catch {
      toast.error({
        title: "Error adding to cart",
        description: "Some variant does not have the required inventory",
      })
    } finally {
      setIsAdding(false)
    }
  }

  const isDisabled =
    !hasAnyPrice ||
    (hasVariants && !allOptionsSelected) ||
    isOutOfStock ||
    !variantHasPrice

  const buttonLabel = !hasAnyPrice
    ? "NOT AVAILABLE"
    : hasVariants && !allOptionsSelected
    ? "SELECT OPTIONS"
    : isOutOfStock || !variantHasPrice
    ? "STOKTA YOK"
    : "ADD TO CART"

  // Only render on mobile (md:hidden) — desktop uses the inline button
  return (
    <div className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white border-t border-border shadow-lg">
      <div className="flex items-center gap-3 px-4 py-3">
        {hasAnyPrice && variantPrice && allOptionsSelected && (
          <div className="flex flex-col min-w-0">
            <span className="heading-sm text-primary truncate">
              {variantPrice.calculated_price}
            </span>
            {variantPrice.calculated_price_number !==
              variantPrice.original_price_number && (
              <span className="label-sm text-secondary line-through truncate">
                {variantPrice.original_price}
              </span>
            )}
          </div>
        )}
        <Button
          onClick={handleAddToCart}
          disabled={isDisabled}
          loading={isAdding}
          className="flex-1 uppercase py-3 flex justify-center"
          size="large"
        >
          {buttonLabel}
        </Button>
      </div>
    </div>
  )
}
