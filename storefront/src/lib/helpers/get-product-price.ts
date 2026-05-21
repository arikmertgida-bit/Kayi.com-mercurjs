import { HttpTypes } from "@medusajs/types"
import { getPercentageDiff } from "./get-precentage-diff"
import { convertToLocale } from "./money"
import { BaseHit, Hit } from "instantsearch.js"

export const getPricesForVariant = (variant: HttpTypes.StoreProductVariant) => {
  if (
    !variant?.calculated_price?.calculated_amount_with_tax &&
    !variant?.calculated_price?.calculated_amount
  ) {
    return null
  }

  if (!variant?.calculated_price?.calculated_amount_with_tax) {
    return {
      calculated_price_number: variant.calculated_price.calculated_amount ?? 0,
      calculated_price: convertToLocale({
        amount: variant.calculated_price.calculated_amount ?? 0,
        currency_code: variant.calculated_price.currency_code ?? "",
      }),
      calculated_price_without_tax: convertToLocale({
        amount: variant.calculated_price.calculated_amount_without_tax ?? 0,
        currency_code: variant.calculated_price.currency_code ?? "",
      }),
      calculated_price_without_tax_number:
        variant.calculated_price.calculated_amount_without_tax ?? 0,
      original_price_number: variant.calculated_price.original_amount ?? 0,
      original_price: convertToLocale({
        amount: variant.calculated_price.original_amount ?? 0,
        currency_code: variant.calculated_price.currency_code ?? "",
      }),
      currency_code: variant.calculated_price.currency_code ?? "",
      price_type: variant.calculated_price.calculated_price?.price_list_type,
      percentage_diff: getPercentageDiff(
        variant.calculated_price.original_amount ?? 0,
        variant.calculated_price.calculated_amount ?? 0
      ),
    }
  }

  return {
    calculated_price_number:
      variant.calculated_price.calculated_amount_with_tax ?? 0,
    calculated_price: convertToLocale({
      amount: variant.calculated_price.calculated_amount_with_tax ?? 0,
      currency_code: variant.calculated_price.currency_code ?? "",
    }),
    calculated_price_without_tax: convertToLocale({
      amount: variant.calculated_price.calculated_amount_without_tax ?? 0,
      currency_code: variant.calculated_price.currency_code ?? "",
    }),
    calculated_price_without_tax_number:
      variant.calculated_price.calculated_amount_without_tax ?? 0,
    original_price_number: variant.calculated_price.original_amount_with_tax ?? 0,
    original_price: convertToLocale({
      amount: variant.calculated_price.original_amount_with_tax ?? 0,
      currency_code: variant.calculated_price.currency_code ?? "",
    }),
    currency_code: variant.calculated_price.currency_code ?? "",
    price_type: variant.calculated_price.calculated_price?.price_list_type,
    percentage_diff: getPercentageDiff(
      variant.calculated_price.original_amount ?? 0,
      variant.calculated_price.calculated_amount ?? 0
    ),
  }
}

export function getProductPrice({
  product,
  variantId,
}: {
  product: Hit<HttpTypes.StoreProduct> | Partial<Hit<BaseHit>>
  variantId?: string
}) {
  if (!product || !product.id) {
    throw new Error("No product provided")
  }

  const cheapestVariant = () => {
    if (!product || !product.variants?.length) {
      return null
    }

    return product.variants
      .filter((v: HttpTypes.StoreProductVariant) => !!v.calculated_price)
      .sort((a: HttpTypes.StoreProductVariant, b: HttpTypes.StoreProductVariant) => {
        return a.calculated_price?.calculated_amount_with_tax &&
          b.calculated_price?.calculated_amount_with_tax
          ? a.calculated_price.calculated_amount_with_tax -
              b.calculated_price.calculated_amount_with_tax
          : (a.calculated_price?.calculated_amount ?? 0) - (b.calculated_price?.calculated_amount ?? 0)
      })[0]
  }

  const cheapestPrice = () => {
    if (!product || !product.variants?.length) {
      return null
    }

    const variant: HttpTypes.StoreProductVariant | undefined = cheapestVariant()
    if (!variant) return null
    return getPricesForVariant(variant)
  }

  const variantPrice = () => {
    if (!product || !variantId) {
      return null
    }

    const variant: HttpTypes.StoreProductVariant | undefined = product.variants?.find(
      (v: HttpTypes.StoreProductVariant) => v.id === variantId || v.sku === variantId
    )

    if (!variant) {
      return null
    }

    return getPricesForVariant(variant)
  }

  return {
    product,
    cheapestPrice: cheapestPrice(),
    variantPrice: variantPrice(),
    cheapestVariant: cheapestVariant(),
  }
}
