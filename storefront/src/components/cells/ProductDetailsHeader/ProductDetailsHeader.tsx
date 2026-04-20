"use client"

import { Button } from "@/components/atoms"
import { HttpTypes } from "@medusajs/types"
import { ProductVariants } from "@/components/molecules"
import { useProductVariants } from "@/hooks/useProductVariants"
import { useState } from "react"
import { addToCart } from "@/lib/data/cart"
import { Chat } from "@/components/organisms/Chat/Chat"
import { SellerProps } from "@/types/seller"
import { WishlistButton } from "../WishlistButton/WishlistButton"
import { Wishlist } from "@/types/wishlist"
import { toast } from "@/lib/helpers/toast"
import { useCartContext } from "@/components/providers"
import { AdditionalAttributeProps } from "@/types/product"

export const ProductDetailsHeader = ({
  product,
  locale,
  user,
  wishlist,
}: {
  product: HttpTypes.StoreProduct & {
    seller?: SellerProps
    attribute_values?: AdditionalAttributeProps[]
    metadata?: Record<string, unknown> | null
  }
  locale: string
  user: HttpTypes.StoreCustomer | null
  wishlist?: Wishlist[]
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

  const isVariantStockMaxLimitReached =
    (cart?.items?.find((item) => item.variant_id === selectedVariant?.id)
      ?.quantity ?? 0) >= variantStock

  const variantHasPrice = !!selectedVariant?.calculated_price

  const handleAddToCart = async () => {
    if (!selectedVariant?.id || !hasAnyPrice || !allOptionsSelected) return null

    setIsAdding(true)

    const subtotal = +(variantPrice?.calculated_price_without_tax_number || 0)
    const total = +(variantPrice?.calculated_price_number || 0)

    const storeCartLineItem = {
      thumbnail: product.thumbnail || "",
      product_title: product.title,
      quantity: 1,
      subtotal,
      total,
      tax_total: total - subtotal,
      variant_id: selectedVariant.id,
      product_id: product.id,
      variant: selectedVariant,
    }

    try {
      if (!isVariantStockMaxLimitReached) {
        onAddToCart(storeCartLineItem, variantPrice?.currency_code || "eur")
      }
      await addToCart({
        variantId: selectedVariant.id,
        quantity: 1,
        countryCode: locale,
      })
    } catch (error) {
      toast.error({
        title: "Error adding to cart",
        description: "Some variant does not have the required inventory",
      })
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <div className="border rounded-sm p-5">
      <div className="flex justify-between">
        <div>
          <h2 className="label-md text-secondary"></h2>
          <h1 className="heading-lg text-primary">{product.title}</h1>
          <div className="mt-2 flex gap-2 items-center">
            {hasAnyPrice && variantPrice ? (
              <>
                <span className="heading-md text-primary">
                  {variantPrice.calculated_price}
                </span>
                {variantPrice.calculated_price_number !==
                  variantPrice.original_price_number && (
                  <span className="label-md text-secondary line-through">
                    {variantPrice.original_price}
                  </span>
                )}
              </>
            ) : (
              <span className="label-md text-secondary pt-2 pb-4">
                Not available in your region
              </span>
            )}
          </div>
        </div>
        <div>
          <WishlistButton
            productId={product.id}
            wishlist={wishlist}
            user={user}
          />
        </div>
      </div>

      {/* Product Variants */}
      {hasAnyPrice && <ProductVariants product={product} />}

      {/* Add to Cart */}
      <Button
        onClick={handleAddToCart}
        disabled={
          !hasAnyPrice ||
          (hasVariants && !allOptionsSelected) ||
          !variantStock ||
          !variantHasPrice
        }
        loading={isAdding}
        className="w-full uppercase mb-4 py-3 flex justify-center"
        size="large"
      >
        {!hasAnyPrice
          ? "NOT AVAILABLE IN YOUR REGION"
          : hasVariants && !allOptionsSelected
          ? "PLEASE SELECT OPTIONS"
          : isOutOfStock || !variantHasPrice
          ? "OUT OF STOCK"
          : "ADD TO CART"}
      </Button>

      {/* Seller message */}
      {user && product.seller && (
        <Chat
          user={user}
          seller={product.seller}
          buttonClassNames="w-full uppercase"
          product={product}
        />
      )}
    </div>
  )
}
