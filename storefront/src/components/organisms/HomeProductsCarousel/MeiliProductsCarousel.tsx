"use client"

import { HttpTypes } from "@medusajs/types"
import { HomeSlider } from "./HomeSlider"
import { useMeiliSearchClient } from "@/providers/MeiliSearchProvider"
import { Configure, useHits } from "react-instantsearch"
import { InstantSearchNext } from "react-instantsearch-nextjs"
import { listProducts } from "@/lib/data/products"
import { useEffect, useState } from "react"
import { getProductPrice } from "@/lib/helpers/get-product-price"

export const MeiliProductsCarousel = ({
  locale,
  seller_handle,
  currency_code,
}: {
  locale: string
  seller_handle?: string
  currency_code: string
}) => {
  const { searchClient } = useMeiliSearchClient()
  const filters = `${
    seller_handle
      ? `seller.handle = "${seller_handle}" AND `
      : ""
  }seller.store_status != SUSPENDED AND variants.prices.currency_code = "${currency_code}"`

  if (!searchClient) {
    return (
      <div className="w-full">
        <div className="h-7 w-40 bg-gray-200 rounded animate-pulse mb-3" />
        <div className="flex gap-1.5 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="home-slider-slide flex-shrink-0 animate-pulse">
              <div className="border rounded-sm p-1">
                <div className="aspect-square w-full bg-gray-200 rounded-sm" />
                <div className="p-4 space-y-2">
                  <div className="h-5 bg-gray-200 rounded-sm w-3/4" />
                  <div className="h-4 bg-gray-200 rounded-sm w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <InstantSearchNext searchClient={searchClient as any} indexName="products">
      <Configure hitsPerPage={10} filters={filters} />
      <ProductsListing locale={locale} />
    </InstantSearchNext>
  )
}

const ProductsListing = ({ locale }: { locale: string }) => {
  const [prod, setProd] = useState<HttpTypes.StoreProduct[] | null>(null)
  const { items } = useHits()

  useEffect(() => {
    listProducts({
      countryCode: locale,
      queryParams: {
        limit: 99999,
        fields:
          "*variants.calculated_price,*seller.reviews,-thumbnail,-images,-type,-tags,-variants.options,-options,-collection,-collection_id",
      },
    }).then(({ response }) => {
      setProd(response.products)
    })
  }, [])

  const resolvedProducts = items
    .map((hit) => {
      const apiProd = prod?.find((p) => {
        const { cheapestPrice } = getProductPrice({ product: p })
        return p.id === ((hit as any).objectID ?? (hit as any).id) && Boolean(cheapestPrice)
      })
      return apiProd ?? null
    })
    .filter((p): p is HttpTypes.StoreProduct => p !== null)

  if (!items.length) {
    return null
  }

  return (
    <div className="w-full">
      <HomeSlider heading="" initialProducts={resolvedProducts} />
    </div>
  )
}
