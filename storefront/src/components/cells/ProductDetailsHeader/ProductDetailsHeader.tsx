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
import { useTranslations } from "next-intl"
import { DiscountBadge } from "@/components/atoms/DiscountBadge/DiscountBadge"
import { BudgetProgressBar } from "@/components/atoms/BudgetProgressBar/BudgetProgressBar"
import { CampaignCountdown } from "@/components/molecules/CampaignCountdown/CampaignCountdown"
import { PromotionStrip } from "@/components/molecules/PromotionStrip/PromotionStrip"
import { ProductPromotion } from "@/lib/data/promotions"

export const ProductDetailsHeader = ({
  product,
  locale,
  user,
  wishlist,
  activePromotion,
}: {
  product: HttpTypes.StoreProduct & {
    seller?: SellerProps
    attribute_values?: AdditionalAttributeProps[]
    metadata?: Record<string, unknown> | null
  }
  locale: string
  user: HttpTypes.StoreCustomer | null
  wishlist?: Wishlist[]
  activePromotion?: ProductPromotion | null
}) => {
  const { onAddToCart, cart } = useCartContext()
  const [isAdding, setIsAdding] = useState(false)
  const t = useTranslations('productDetails')

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
        onAddToCart(storeCartLineItem, variantPrice?.currency_code || "try")
      }
      await addToCart({
        variantId: selectedVariant.id,
        quantity: 1,
        countryCode: locale,
      })
    } catch (error) {
      toast.error({
        title: t('addToCartError'),
        description: t('addToCartErrorDesc'),
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
                {activePromotion && (
                  <DiscountBadge
                    value={activePromotion.discount_value}
                    type={activePromotion.discount_type}
                  />
                )}
              </>
            ) : hasAnyPrice && hasVariants && !allOptionsSelected ? (
              <span className="label-md text-secondary pt-2 pb-4">
                {t('selectOptionsPrice')}
              </span>
            ) : (
              <span className="label-md text-secondary pt-2 pb-4">
                {t('notAvailableRegion')}
              </span>
            )}
          </div>

          {/* Promotion details */}
          {activePromotion && (
            <div className="mt-3 flex flex-col gap-2">
              {activePromotion.display_code && (
                <PromotionStrip
                  displayCode={activePromotion.display_code}
                  scope={activePromotion.scope}
                />
              )}
              {activePromotion.campaign?.ends_at && (
                <CampaignCountdown endsAt={activePromotion.campaign.ends_at} />
              )}
              {activePromotion.campaign?.budget_remaining_pct !== undefined && (
                <BudgetProgressBar
                  remainingPct={activePromotion.campaign.budget_remaining_pct}
                />
              )}
            </div>
          )}
        </div>
        <div>
          <WishlistButton
            productId={product.id}
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
          isOutOfStock ||
          !variantHasPrice
        }
        loading={isAdding}
        className="w-full uppercase mb-4 py-3 flex justify-center"
        size="large"
      >
        {!hasAnyPrice
          ? t('notAvailableRegionUpper')
          : hasVariants && !allOptionsSelected
          ? t('pleaseSelectOptions')
          : isOutOfStock || !variantHasPrice
          ? t('outOfStock')
          : t('addToCart')}
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
